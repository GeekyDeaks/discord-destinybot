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

        if(args.length === 0) {
            // check if the vote is underway
            if(vote && isEligible(msg)) {
                var now = new Date().getTime();
                var token = crypto.createHash('md5').update(msg.author.id+"@"+now).digest('hex');
                // save the hash
                yield collection.update({ type: "voter", "discord" : msg.author.id},
                {$set : { token : token, createdAt : now, submitted: false}}, {upsert : true});

                // create a URL for the message author
                var url = "http://"+config.modules.voc.mvote.host+":"+config.modules.voc.mvote.port+"/mvote/"+token;
                return message.send(msg, "Click this link to vote: "+url, false);
            } else {
                return message.send(msg, "Sorry, either the membership vote is not active or you are not eligible to vote", false);
            }
        }

        var option = args.shift().toLowerCase();
        if(!isAdmin(msg)) return message.send(msg, "you do not have permission to administer a vote", false);

        switch (option) {
            case 'status':
                if(!vote) {
                    return message.send(msg, "no vote started");
                }
                var toSend = [];
                var line = [];
                var startedBy = server.members.get("id", vote.startedBy);
                line.push("```"+cmd.format);
                line.push("Started At: " + new Date(vote.startedAt).toISOString());
                line.push("Started By: " + startedBy.username);
                line.push("    Active: "+ vote.active);
                line.push("```");
                toSend.push(line.join("\n"));
                toSend.push("```"+cmd.format+"\n━━ Candidates ━━━━━━━━━━━━━━━━━━━```");

                var candidate;
                var cc = collection.find({ type : "candidate"}).sort("joinedAt");
                var vc;
                var voter;
                var member;
                var result;
                while (yield cc.hasNext()) {
                    candidate = yield cc.next();
                    //
                    member = server.members.get("id", candidate.discord);
                    if(!member) {
                        logger.error("mvote: failed to resolve discord ID: "+candidate.discord);
                        continue;
                    }
                    candidate.approve = candidate.neutral = candidate.disapprove = 0;
                    vc = collection.find({ type : vote, candidate : candidate.discord });
                    while (yield vc.hasNext()) {
                        voter = yield vc.next();
                        //candidate.approve += voter.approve;
                        //candidate.neutral += voter.neutral;
                        //candidate.disapprove += voter.disapprove;
                    }

                    logger.debug("mvote: candidate: ", candidate);
                    
                    if(candidate.disapprove) {
                        result = 'disapprove';
                    } else if(!candidate.approve) {
                        result = 'neutral';
                    } else {
                        result = 'approve';
                    }

                    toSend.push(member.username + ","+ new Date(candidate.joinedAt).toISOString() +
                    "," + result +
                    ","+candidate.approve+","+candidate.neutral+","+candidate.disapprove);
                }

                return message.send(msg, toSend, false);
            case 'start':
                if(vote) {
                    return message.send(msg, "stop and clear current vote first", false);
                }
                var details = {
                    type: "details",
                    startedAt: moment().valueOf(),
                    startedBy: msg.author.id,
                    active: true
                }
                logger.debug("started vote: ", details);
                yield collection.insert(details);
                return message.send(msg, "vote started", false);
            case 'seed':
                if(!vote || !vote.active) {
                    return message.send(msg, "no active vote in progress", false);
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
                        yield addCandidate(member.id, joinedAt);
                    }
                }
                return message.send(msg, "seeded "+count+" candidates", false);
            case 'end':
                if(!vote || !vote.active) {
                    return message.send(msg, "no active vote in progress", false);
                }       
                yield collection.update( {type : "details"}, {$set : { active : false}});
                return message.send(msg, "voting ended", false);         
            case 'clear':
                if(!vote) {
                    return message.send(msg, "no vote to clear", false);
                }
                if(vote.active) { 
                    return message.send(msg, "vote still running", false);
                }
                // remove the vote
                yield collection.remove({});
                return message.send(msg, "voting cleared", false);
            case 'add':

                break;
            case 'del':

                break;
            default:
                return message.send(msg, "sorry, don't know what to do with `"+option+"`", false);
        }

        //message.send(msg, toSend, cmd.isPublic);

   });
}

function addCandidate(discord, joinedAt) {
    var collection = db.collection(config.modules.voc.mvote.collection);
    return collection.update({ type : "candidate", discord : discord} ,
    {$set : { joinedAt : joinedAt }}, {upsert : true});
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
            "\t\t`mvote` - generate a URL to vote",
            "\t\t`mvote status` - report voting status and/or results",
            "\t\t`mvote start` - starts a membership vote",
            "\t\t\mvote seed <role> <YYYY-MM-DD>` - seed with users in <role> who joined after <date>",
            "\t\t`mvote end` - ends the vote and prevents any further vote casting",
            "\t\t`mvote clear` - clears the vote results",
            "\t\t`mvote add <user>` - add user to the ote",
            "\t\t`mvote del <user>` - remove user from the vote"],
    alias: [],
    exec: exec,
    admin: false
};