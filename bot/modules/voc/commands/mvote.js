'use strict';

var co = require('co');
var crypto = require('crypto');
var logger = require('winston');
var md = require('../../../markdown');
var message = require('../../../message');
var moment = require('moment-timezone');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

// stolen from co-wait
function wait(ms) {
  return function(done) {
    setTimeout(done, ms);
  }
}

function exec(cmd) {

   return co(function* () {
        var msg = cmd.msg;
        var args = cmd.args;
        var server = msg.guild || app.defaultServer;

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
                    {$set : { token : token, createdAt : now, name : msg.author.username, sort : msg.author.username.toUpperCase() }, 
                      $inc: { tokens: 1} }, {upsert : true});

                // create a URL for the message author
                var url = "http://"+config.modules.voc.mvote.host+":"+config.modules.voc.mvote.port+"/mvote/cast/"+token;
                return message.send(msg, "Please use this link to vote: "+url);
            } else {
                return message.send(msg, "Sorry, either the membership vote is not active or you are not eligible to vote", false);
            }
        }

        var option = args.shift().toLowerCase();
        if(!isAdmin(msg)) return message.send(msg, "you do not have permission to administer a vote");

        switch (option) {
            case 'loadtest':
                if (!vote) {
                    return message.send(msg, "no vote created");
                }
                var now = new Date().getTime();
                var token = crypto.createHash('md5').update(msg.author.id + "@" + now).digest('hex');
                // save the hash
                _id = 'loadtest';
                yield collection.update({ _id: _id, type: _id },
                    { $set: { token: token, createdAt: now } }, { upsert: true });

                var url = "http://" + config.modules.voc.mvote.host + ":" + config.modules.voc.mvote.port + "/mvote " + token;
                return message.send(msg, "Please use this link and token to loadtest: `" + url + "`");
            case 'review':
            case 'status':
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
                return message.send(msg, "Please use this link to review: "+url);
                
            case 'create':
                if(vote) {
                    return message.send(msg, "stop and clear current vote first");
                }
                if(!args.length) {
                    return message.send(msg, "you need to specify a title for the vote");
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
                return message.send(msg, "vote created");
            case 'start':
                if (!vote) {
                    return message.send(msg, "no vote created");
                }
                if(vote.state !== "created") {
                    return message.send(msg, "vote already started");
                }
                yield collection.update({type : "details"}, 
                    {$set : {
                        state : "running",
                        startedAt: moment().valueOf(),
                        startedBy: msg.author.id
                    }});
                logger.debug("started vote: ", details);
                return message.send(msg, "vote started");
            case 'invite':
                if (!vote) {
                    return message.send(msg, "no vote created");
                }
                if (vote.state !== "created") {
                    return message.send(msg, "vote already started");
                }

                var role = args.shift();
                if(!role) return message.send(msg, "no role specified");
                var jdate = args.shift();
                if(!jdate) return message.send(msg, "no joined date specified");
                var ddate = args.shift();
                if(!ddate) return message.send(msg, "no deadline specified");

                var timeZone = config.timeZone || "Etc/GMT";

                // try and parse the joined date
                var jday = moment.tz(jdate, timeZone);
                if(!jday) return message.send(msg, "unable to parse joined date: `"+jdate+"`");
                var dday = moment.tz(ddate, timeZone);
                if(!dday) return message.send(msg, "unable to parse expiry date: `"+ddate+"`");

                var busyMsg = yield message.send(msg, ":hourglass: sending invites");
                // loop though all the members
                var member;
                var joinedAt;
                var count = 0;
                var skipped = 0;
                var _id;
                // make sure we have all the members
                yield server.fetchMembers();
                var members = server.members.array();
                var failed = [];
                logger.debug("mvote invite: checking %d members", members.length);
                while(member = members.shift()) {
                    logger.debug("checking [%s]", member.user.username);
                    if(!member.roles.exists("name", role)) continue;
                    if(member.joinDate < jday.valueOf()) {
                        switch(yield sendInvite(member, dday)) {
                            case 'ack':
                                skipped++;
                                break;
                            case 'sent':
                                count++;
                                break;
                            default :
                                failed.push(member);
                        }
                        //yield wait(1000); // wait 1 second to prevent throttling
                    }
                }               
                var statusMsg = ["sent "+count+" invites"];
                if(skipped) statusMsg.push("skipped "+skipped+" candidates who previously accepted");
                if(failed.length) {
                    statusMsg.push(failed.length+ " invites failed to send:");
                    failed.forEach(function(m) { statusMsg.push(m.user.username)});
                }
                return message.update(busyMsg, statusMsg);
            case 'seed':
                if (!vote) {
                    return message.send(msg, "no vote created");
                }
                if (vote.state !== "created") {
                    return message.send(msg, "vote already started");
                }

                var role = args.shift();
                var date = args.shift();
                if(!role || !date) {
                    return message.send(msg, "you need to specify a role and joined date");
                }

                var timeZone = config.timeZone || "Etc/GMT";

                // try and parse the date
                var day = moment.tz(date, timeZone);
                if(!day) return message.send(msg, "unable to parse date: `"+date+"`");

                // loop though all the members
                var member;
                var joinedAt;
                var count = 0;
                var members = server.members.array();
                while(member = members.shift()) {
                    if(!member.roles.exists("name", role)) continue;
                    if(member.joinDate < day.valueOf()) {
                        count++;
                        yield addCandidate(member, 1);
                    }
                }
                return message.send(msg, "seeded "+count+" candidates");
            case 'end':
                if (!vote) {
                    return message.send(msg, "no vote created");
                }
                if (vote.state !== "running") {
                    return message.send(msg, "vote is not running");
                }
                yield collection.update({type : "details"}, 
                    {$set : {
                        state : "ended",
                        endedAt: moment().valueOf(),
                        endedBy: msg.author.id
                    }});
                return message.send(msg, "voting ended");         
            case 'clear':
                if(!vote) {
                    return message.send(msg, "no vote to clear");
                }
                if(vote.state !== 'ended') { 
                    return message.send(msg, "vote has not ended");
                }
                // remove the vote
                yield collection.remove({});
                return message.send(msg, "voting cleared");
            case 'add':
                if (!vote) {
                    return message.send(msg, "no vote created");
                }
                if (vote.state !== "created") {
                    return message.send(msg, "vote already started");
                }
                if(!args.length) {
                    return message.send(msg, "no user specified");
                }

                var member = server.members.find(m => m.user.username === args[0]);
                if(!member) {
                    return message.send(msg, "unable to find member `"+args[0]+"` on this server");
                }
                addCandidate(member, args[1]);
                return message.send(msg, "added candidate `"+args[0]+"`");

            case 'rm':
            case 'remove':
            case 'delete':
            case 'del':
                if (!vote) {
                    return message.send(msg, "no vote created");
                }
                if (vote.state !== "created") {
                    return message.send(msg, "vote already started");
                }
                if(!args.length) {
                    return message.send(msg, "no user specified");
                }

                var member = server.members.find(m => m.user.username === args[0]);
                
                yield collection.remove({ type: "candidate", id : member.user.id});
                return message.send(msg, "deleted candidate `"+args[0]+"`");
            default:
                return message.send(msg, "sorry, don't know what to do with `"+option+"`");
        }

        //message.send(msg, toSend, cmd.pm);

   });
}

function addCandidate(member, round) {
    var collection = db.collection(config.modules.voc.mvote.collection);
    var _id = 'candidate.'+member.user.id;
    return collection.update({ _id : _id, type : "candidate", id : member.user.id},
        {$set : { joinedAt : member.joinDate, name : member.user.username, 
            nickname : member.nickname, sort : member.user.username.toUpperCase(), round: round }}, 
        {upsert : true});
}

function sendInvite(member, deadline) {
    return co(function* () {
        var collection = db.collection(config.modules.voc.mvote.collection);
        var _id = 'invite.' + member.user.id;
        
        var m = yield collection.findOne({ _id: _id, ack : true });
        if (m) return 'ack'; // invite already acknowledged 
        // upsert the invite
        yield collection.update({ _id: _id, type: "invite", id: member.user.id },
            {
                $set: { 
                    invitedAt: moment().valueOf(), ack : false, 
                    name : member.user.username, 
                    nickname : member.nickname, 
                    sort : member.user.username.toUpperCase() 
                },
                $inc: { invites: 1 }
            },
            { upsert: true });

        // now send a message to the invitee
        logger.info("sending invite to: "+member.user.username);
        // moment(lastTokenAt).fromNow()
        var timeZone = config.timeZone || "Etc/GMT";
        var response = config.modules.voc.mvote.inviteMsg.
            replace(/:USER:/g, member.user).
            replace(/:DEADLINE:/g, deadline.tz(timeZone).format("YYYY-MM-DD HH:mm z")).
            replace(/:REMAINING:/g, deadline.fromNow());
        try {
            yield member.user.sendMessage(response);
        } catch (err) {
            logger.error("Error when sending invite to: '"+member.user.username+"':", err);
            return 'fail';
        } 
        
        return 'sent';
        
    });

}

function isEligible(msg) {
    var server = msg.guild || app.defaultServer;
    var member = server.member(msg.author);
    if(!member) return false;
    return member.roles.exists("name", config.modules.voc.mvote.voteRole);
}

function isAdmin(msg) {
    var server = msg.guild || app.defaultServer;
    var member = server.member(msg.author);
    if(!member) return false;
    return member.roles.exists("name", config.modules.voc.mvote.adminRole);
}

module.exports = {
    desc: 'Membership vote',
    name: 'mvote',
    usage: ["",  // this causes a CR
            "\t\t`mvote` - generate a URL to vote or view results",
            "\t\t`mvote create <title>` - create a new vote",
            "\t\t`mvote review` - review vote",
            "\t\t`mvote seed <role> <joindate>` - seed with users in <role> who joined prior to <joindate>",
            "\t\t`mvote invite <role> <joindate> <deadline>` - seed with users in <role> who joined prior to <joindate>",
            "\t\t`mvote add <user> [round]` - add user to the vote",
            "\t\t`mvote del <user>` - remove user from the vote",
            "\t\t`mvote start` - starts a membership vote",
            "\t\t`mvote end` - ends the vote and prevents any further vote casting",
            "\t\t`mvote clear` - clears the vote results"],
    alias: [],
    exec: exec,
    admin: false
};