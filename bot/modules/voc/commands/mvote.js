'use strict';

var co = require('co');
var crypto = require('crypto');
var logger = require('winston');
//var psn = require('../psn');
var md = require('../../../markdown');
var parse = require('../parse');
var message = require('../../../message');
var moment = require('moment');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

function exec(cmd) {

   return co(function* () {
        var msg = cmd.msg;
        var args = cmd.args;
        var server = msg.server || app.defaultServer;

        var collection = db.collection(config.modules.voc.mvote.collection);
        var vote = yield collection.findOne({ type : "details" });

        var _id;

        if(args.length === 0) {
            // check if the vote is underway
            if(vote && vote.state === "running" && isEligible(msg)) {
                var now = new Date().getTime();
                var token = crypto.createHash('md5').update(msg.author.id+"@"+now).digest('hex');
                // save the hash
                _id = 'voter.'+msg.author.id;
                yield collection.update({ _id : _id, type: "voter", "id" : msg.author.id},
                    {$set : { token : token, createdAt : now, name : msg.author.name, sort : msg.author.name.toUpperCase() }, 
                      $inc: { tokens: 1} }, {upsert : true});

                // create a URL for the message author
                var url = "http://"+config.modules.voc.mvote.host+":"+config.modules.voc.mvote.port+"/mvote/cast/"+token;
                return message.send(msg, "Please use this link to vote: "+url, false);
            } else {
                return message.send(msg, "Sorry, either the membership vote is not active or you are not eligible to vote", false);
            }
        }

        var option = args.shift().toLowerCase();
        if(!isAdmin(msg)) return message.send(msg, "you do not have permission to administer a vote", false);

        switch (option) {
            case 'review':
                if(!vote) {
                    return message.send(msg, "no vote created");
                }
                var now = new Date().getTime();
                var token = crypto.createHash('md5').update(msg.author.id+"@"+now).digest('hex');
                // save the hash
                _id = 'review';
                yield collection.update({ _id : _id, type: _id },
                    {$set : { token : token, createdAt : now}}, {upsert : true});

                var url = "http://"+config.modules.voc.mvote.host+":"+config.modules.voc.mvote.port+"/mvote/review/"+token;
                return message.send(msg, "Please use this link to review: "+url, false);
                
            case 'create':
                if(vote) {
                    return message.send(msg, "stop and clear current vote first", false);
                }
                if(!args.length) {
                    return message.send(msg, "you need to specify a title for the vote", false);
                }
                var details = {
                    _id: "details",
                    type: "details",
                    title: args.join(" "),
                    createdAt: moment().valueOf(),
                    createdBy: msg.author.id,
                    state: "created"
                }
                logger.debug("started vote: ", details);
                
                yield collection.insert(details);
                return message.send(msg, "vote created", false);
            case 'start':
                if (!vote) {
                    return message.send(msg, "no vote created", false);
                }
                if(vote.state !== "created") {
                    return message.send(msg, "vote already started", false);
                }
                yield collection.update({type : "details"}, 
                    {$set : {
                        state : "running",
                        startedAt: moment().valueOf(),
                        startedBy: msg.author.id
                    }});
                logger.debug("started vote: ", details);
                return message.send(msg, "vote started", false);
            case 'seed':
                if (!vote) {
                    return message.send(msg, "no vote created", false);
                }
                if (vote.state !== "created") {
                    return message.send(msg, "vote already started", false);
                }

                var roleName = args.shift();
                var date = args.shift();
                if(!roleName || !date) {
                    return message.send(msg, "you need to specify a role and joined date", false);
                }

                // find the role
                var role = server.roles.get("name", roleName);
                if(!role) return message.send(msg, "unable to find role: `"+roleName+"`", false);

                // try and parse the date
                var day = moment(date);
                if(!day) return message.send(msg, "unable to parse date: `"+date+"`", false);

                // loop though all the members
                var member;
                var joinedAt;
                var count = 0;
                for(var c = 0; c < server.members.length; c++) {
                    member = server.members[c];
                    if(!member.hasRole(role)) continue;
                    joinedAt = server.detailsOfUser(member).joinedAt;
                    if (joinedAt < day.valueOf()) {
                        count++;
                        yield addCandidate(member, joinedAt, 1);
                    }
                }
                return message.send(msg, "seeded "+count+" candidates", false);
            case 'end':
                if (!vote) {
                    return message.send(msg, "no vote created", false);
                }
                if (vote.state !== "running") {
                    return message.send(msg, "vote is not running", false);
                }
                yield collection.update({type : "details"}, 
                    {$set : {
                        state : "ended",
                        endedAt: moment().valueOf(),
                        endedBy: msg.author.id
                    }});
                return message.send(msg, "voting ended", false);         
            case 'clear':
                if(!vote) {
                    return message.send(msg, "no vote to clear", false);
                }
                if(vote.state !== 'ended') { 
                    return message.send(msg, "vote has not ended", false);
                }
                // remove the vote
                yield collection.remove({});
                return message.send(msg, "voting cleared", false);
            case 'add':
                if (!vote) {
                    return message.send(msg, "no vote created", false);
                }
                if (vote.state !== "created") {
                    return message.send(msg, "vote already started", false);
                }
                if(!args.length) {
                    return message.send(msg, "no user specified", false);
                }

                var member = server.members.get("name", args[0]);
                if(!member) {
                    return message.send(msg, "unable to find member `"+args[0]+"` on this server", false);
                }
                var joinedAt = server.detailsOfUser(member).joinedAt;
                addCandidate(member, joinedAt, args[1]);
                return message.send(msg, "added candidate `"+args[0]+"`", false);

            case 'del':
                if (!vote) {
                    return message.send(msg, "no vote created", false);
                }
                if (vote.state !== "created") {
                    return message.send(msg, "vote already started", false);
                }
                if(!args.length) {
                    return message.send(msg, "no user specified", false);
                }

                var member = server.members.get("name", args[0]);
                
                if(!member) {
                    return message.send(msg, "unable to find member `"+args[0]+"` on this server", false);
                }
                yield collection.remove({ type: "candidate", id : member.id});
                return message.send(msg, "deleted candidate `"+args[0]+"`", false);
            default:
                return message.send(msg, "sorry, don't know what to do with `"+option+"`", false);
        }

        //message.send(msg, toSend, cmd.isPublic);

   });
}

function addCandidate(member, joinedAt, round) {
    var collection = db.collection(config.modules.voc.mvote.collection);
    var _id = 'candidate.'+member.id;
    return collection.update({ _id : _id, type : "candidate", id : member.id},
        {$set : { joinedAt : joinedAt, name : member.name, sort : member.name.toUpperCase(), round: round }}, 
        {upsert : true});
}

function isEligible(msg) {
    var server = msg.server || app.defaultServer;
    var role = server.roles.get("name", config.modules.voc.mvote.voteRole);
    if(!role) return false;
    return msg.author.hasRole(role);
}

function isAdmin(msg) {
    var server = msg.server || app.defaultServer;
    var role = server.roles.get("name", config.modules.voc.mvote.adminRole);
    if(!role) return false;
    return msg.author.hasRole(role);
}

module.exports = {
    desc: 'Membership vote',
    name: 'mvote',
    usage: ["",  // this causes a CR
            "\t\t`mvote` - generate a URL to vote or view results",
            "\t\t`mvote create <title>` - create a new vote",
            "\t\t`mvote review` - review vote",
            "\t\t`mvote seed <role> <YYYY-MM-DD>` - seed with users in <role> who joined prior to <date>",
            "\t\t`mvote add <user> [round]` - add user to the vote",
            "\t\t`mvote del <user>` - remove user from the vote",
            "\t\t`mvote start` - starts a membership vote",
            "\t\t`mvote end` - ends the vote and prevents any further vote casting",
            "\t\t`mvote clear` - clears the vote results"],
    alias: [],
    exec: exec,
    admin: false
};