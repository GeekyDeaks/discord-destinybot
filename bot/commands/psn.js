'use strict';

var co = require('co');
var psn = require('../psn');

function exec(cmd) {

    var msg = cmd.msg;
    var bot = cmd.bot;
    var discord = cmd.args[0];

    if(!discord) {
        return bot.sendMessage(msg, "did you forget something?");
    }

    var gamer = psn.lookup(discord);
    if(!gamer) {
        return bot.sendMessage(msg, "Sorry, could not find **"+discord+"**");
    }

    return bot.sendMessage(msg, "Discord: **"+discord.replace("_", "\\_")+"**, PSN: **"+gamer.psn.replace("_", "\\_")+"**");

}

module.exports = {
    desc: 'Lookup PSN name for a discord account',
    name: 'psn',
    usage: 'psn <discord-id>',
    alias: [''],
    exec: exec
};
