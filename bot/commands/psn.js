'use strict';

var co = require('co');
var psn = require('../psn');
var md = require('../markdown');

function exec(cmd) {

    var msg = cmd.msg;
    var bot = cmd.bot;
    var name = cmd.args[0];

    // mentions take precedent
    if (msg.mentions.length > 0) {
        name = msg.mentions[0].username;
    } 

    if (!name) {
        return bot.sendMessage(msg, "did you forget something?");
    }

    var gamer = psn.lookup(name);
    if(!gamer) {
        return bot.sendMessage(msg, "Sorry, could not find **"+md.escape(name)+"**");
    }

    return bot.sendMessage(msg, "Discord: **@"+md.escape(gamer.discord)+"**, PSN: **"+md.escape(gamer.psn)+"**");

}

module.exports = {
    desc: 'Lookup PSN name for a discord account',
    name: 'psn',
    usage: 'psn <@discord-id>',
    alias: [],
    exec: exec
};
