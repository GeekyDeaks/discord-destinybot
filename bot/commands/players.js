'use strict';

var co = require('co');
var psn = require('../psn');

function exec(cmd) {

    var msg = cmd.msg;
    var bot = cmd.bot;
    var game = cmd.args[0];

    if(!game) {
        return bot.sendMessage(msg, "did you forget something?");
    }

    var p = psn.players(game);
    if(!p || p.length === 0) {
        return bot.sendMessage(msg, "Sorry, could not find any players for **"+game+"**");
    }

    var toSend = [];
    p.forEach(
        function (g) {
            toSend.push("@"+g.discord.replace("_", "\\_")+" | PSN: **"+
                g.psn.replace("_", "\\_")+"** | TZ: **"+g.tz+"**");
        }
    );

    return bot.sendMessage(msg, toSend.join("\n"));

}

module.exports = {
    desc: 'lookup players for a game',
    name: 'players',
    usage: 'players <gameid>',
    alias: [''],
    exec: exec
};