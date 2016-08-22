'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var md = require('../../../markdown');
var api = require('../api');
var membership = require('../membership');
var manifest = require('../manifest');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;

var genderType = ['Male', 'Female'];
var classType = ['Titan', 'Hunter', 'Warlock'];

function exec(cmd) {

    return co(function* () {

        var msg = cmd.msg;

        var memType = membership.type(cmd);
        var name;
        var busyMsg;

        try {
            // figure out the username
            if(msg.mentions.length > 0) {
                name = msg.mentions[0].username;
            } else {
                name = cmd.args[0] || cmd.msg.author.username;
            }

            // sometimes we get the @ come through..
            name = name.replace(/^@/, '');

            /*
            var gamer = psn.lookup(name);
            if (gamer) {
                name = gamer.psn;
            }
            /* */
            if(!name) {
                // should not really get here...
                return bot.sendMessage(msg, "did you forget something?");
            }

            busyMsg = yield bot.sendMessage(msg, "Looking up **"+md.escape(name)+"** :mag:");
            var m = yield api.search(memType, name);
            if(!m.length) {
                return bot.updateMessage(busyMsg, 
                    "Sorry, bungie does not seem to know anything about **"+md.escape(name)+"**");
            }
            var r = yield api.summary(memType, m[0].membershipId);
            name = m[0].displayName;

            var toSend = [];
            var firstline;

            for(var c = 0; c < r.data.characters.length; c++) {
                var guardian = r.data.characters[c];

                logger.debug("summary for character ",util.inspect(guardian, {depth: 1}));

                var currentActivity = yield manifest.getDestinyActivityDefinition(guardian.characterBase.currentActivityHash);
                firstline = "━━ "+name+" / "+ (c + 1) + " ";
                firstline += "━".repeat(40 - firstline.length);
                // bot.sendFile(msg, "http://www.bungie.net"+c.backgroundPath);
                toSend.push("```ruby\n" + firstline + "\n" +
                    "    Guardian: "+ genderType[guardian.characterBase.genderType] + " " +
                        classType[guardian.characterBase.classType] + "\n" +
                    "       Level: " + guardian.characterLevel + "\n" +
                    "       Light: " + guardian.characterBase.powerLevel + "\n" +
                    "Hours Played: " + Math.round( guardian.characterBase.minutesPlayedTotal / 6) / 10 +
                    (currentActivity ? ( "\n" +
                    "    Activity: " + currentActivity.activityName
                    ) : "" ) +
                    "```"
                );
            }

            return bot.updateMessage(busyMsg, toSend.join("\n"));

        } catch (err) {
            var errmsg = "sorry, something unexpected happened: ```"+err+"```";

            if(busyMsg) {
                bot.updateMessage(busyMsg, errmsg);
            } else {
                bot.sendMessage(msg, errmsg);
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

