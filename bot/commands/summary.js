'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var psn = require('../psn');
var md = require('../markdown');

var genderType = ['Male', 'Female'];
var classType = ['Titan', 'Hunter', 'Warlock'];

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var config = cmd.config;
        var name;
        var busyMsg;

        try {
            // figure out the username
            if(msg.mentions.length > 0) {
                var gamer = psn.lookup(msg.mentions[0].username);
                if(gamer) {
                    name = gamer.psn;
                }
            } else {
                name = cmd.args[0];
            }

            if(!name) {
                return bot.sendMessage(msg, "did you forget something?");
            }

            busyMsg = yield bot.sendMessage(msg, "Looking up **"+md.escape(name)+"** :mag:");
            var r = yield cmd.destiny.summary(config.destiny.defaultType, name);

            var toSend = [];
            toSend.push("**"+md.escape(name)+"**");
            r.Response.data.characters.forEach(function (c) {
                logger.debug("summary for character ",util.inspect(c, {depth: 1}));
                // bot.sendFile(msg, "http://www.bungie.net"+c.backgroundPath);
                toSend.push(
                    util.format("%s %s | Level: **%s** | Light: **%s**",
                        genderType[c.characterBase.genderType],
                        classType[c.characterBase.classType],
                        c.characterLevel,
                        c.characterBase.powerLevel
                    )
                );
            })

            return bot.updateMessage(busyMsg, toSend.join("\n"));

        } catch (err) {
            var errmsg;
            if(err.message.match(/UserCannotResolveCentralAccount/)) {
                errmsg = "Sorry, bungie does not seem to know anything about **"+md.escape(name)+"**";
            } else {
                errmsg = "sorry, something unexpected happened: _"+err+"_";
            }

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
    usage: 'summary <psn-id>|<@discord-id>',
    alias: ['sum'],
    exec: exec
};

