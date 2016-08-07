'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');

var genderType = ['Male', 'Female'];
var classType = ['Titan', 'Hunter', 'Warlock'];

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var config = cmd.config;



        try {
            bot.startTyping(msg);
            var r = yield cmd.destiny.summary(config.destiny.defaultType, cmd.args[0]);

            var toSend = [];

            r.Response.data.characters.forEach(function (c) {
                logger.debug("summary for character ",c);
                // bot.sendFile(msg, "http://www.bungie.net"+c.backgroundPath);
                bot.sendMessage(msg, util.format("%s %s | Level: **%s** | Light: **%s**",
                    genderType[c.characterBase.genderType],
                    classType[c.characterBase.classType],
                    c.characterLevel,
                    c.characterBase.powerLevel)
                );
            })

            return bot.stopTyping(msg);
            //return bot.sendMessage(msg, toSend.join("\n"));
        } catch (err) {
            bot.sendMessage(msg, err);
            bot.stopTyping(msg);

        }
    });

}

module.exports = {
    desc: 'Get player summary',
    name: 'summary',
    usage: 'summary [xbl|psn] <id>',
    alias: ['sum'],
    exec: exec
};

