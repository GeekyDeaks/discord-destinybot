'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var md = require('../../../markdown');
var api = require('../api');
var membership = require('../membership');
var manifest = require('../manifest');
var message = require('../../../message');
var gamer = require('../../gamer');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

var genderType = ['Male', 'Female'];
var classType = ['Titan', 'Hunter', 'Warlock'];

function summary(type, name, format) {
    return co(function* () {

        var m = yield api.search(type, name);
        if(!m.length) return;

        var r = yield api.summary(type, m[0].membershipId);
        if(!r) return;

        var toSend = [];
        var line = [];

        for(var c = 0; c < r.data.characters.length; c++) {

                line.length = 0;

                var guardian = r.data.characters[c];

                logger.debug("summary for character ",util.inspect(guardian, {depth: 1}));

                var currentActivity = yield manifest.getDestinyActivityDefinition(guardian.characterBase.currentActivityHash);

                line[0] = "━━ "+ membership.name(type) + " / " + m[0].displayName+" / "+ (c + 1) + " ";
                line[0] += "━".repeat(40 - line[0].length);
                line[0] = "```" + format + "\n" + line[0];

                line.push("    Guardian: "+ genderType[guardian.characterBase.genderType] + " " +
                        classType[guardian.characterBase.classType]);

                line.push("       Level: " + guardian.characterLevel);
                line.push("       Light: " + guardian.characterBase.powerLevel);
                line.push("Hours Played: " + Math.round( guardian.characterBase.minutesPlayedTotal / 6) / 10);

                if(currentActivity)
                    line.push("    Activity: " + currentActivity.activityName);

                line.push("```");

                toSend.push(line.join("\n"));
            }

            return toSend;
        
    });
}

function exec(cmd) {

    return co(function* () {

        var msg = cmd.msg;

        var memType = membership.type(cmd);
        var name;
        var busyMsg;
        var xbl;
        var psn;

        try {
            var g;

            // figure out the username
            if (msg.mentions.length > 0) {
                name = msg.mentions[0].username;
                g = yield gamer.findById(msg.mentions[0].id);
            } else if(cmd.args[0]) {
                name = cmd.args[0].replace(/^@/, '');
                g = yield gamer.findOneByName(name);
            } else {
                name = cmd.msg.author.username;
                g = yield gamer.findById(cmd.msg.author.id);
            }

            // we should get here pretty quick
            busyMsg = yield message.send(msg, ":mag: Looking up **"+md.escape(name)+"**", cmd.isPublic);

            if(g) {
                xbl = g.xbl;
                psn = g.psn;
            } else {
                xbl = name;
                psn = name;
            }

            var toSend = [];
            var mt;
            var out;
            while(mt = memType.shift()) {
                //
                out = undefined;
                switch(mt) {
                    case membership.XBL:
                        if(xbl)
                            out = yield summary(membership.XBL, xbl, cmd.format);
                        break;
                    case membership.PSN:
                        if(psn) 
                            out = yield summary(membership.PSN, psn, cmd.format);
                        break;
                }
                // concat the array in place
                // http://stackoverflow.com/questions/4156101/javascript-push-array-values-into-another-array
                if(out) toSend.push.apply(toSend, out);
            }

            if(!toSend.length) {
                return message.update(busyMsg, 
                    "Sorry, bungie does not seem to know anything about **"+md.escape(name)+"**", 10000);
            }

            return message.update(busyMsg, toSend);

        } catch (err) {
            var errmsg = "sorry, something unexpected happened: ```"+err+"```";

            if(busyMsg) {
                message.update(busyMsg, errmsg, 10000);
            } else {
                message.send(msg, errmsg, isPublic, 10000);
            }

        }
    });

}

module.exports = {
    desc: 'Get Destiny player summary',
    name: 'summary',
    usage: '`summary [xbl|psn] <xbl-id>|<psn-id>|<@discord-id>`',
    alias: ['sum'],
    exec: exec
};

