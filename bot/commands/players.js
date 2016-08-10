'use strict';

var co = require('co');
var psn = require('../psn');
var md = require('../markdown');
var moment = require('moment-timezone');

function exec(cmd) {

    var msg = cmd.msg;
    var bot = cmd.bot;
    var game = cmd.args[0];
    var now = moment();

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
            var localtime;
            // figure out the Localtime
            if(g.tz && moment.tz.zone(g.tz)) {
                localtime = "Localtime: **"+now.tz(g.tz).format("HH:mm (Z z)")+"**";
            } else {
                localtime = "TZ: **"+g.tz+"**";
            }
            toSend.push("@"+md.escape(g.discord)+" | PSN: **"+
                md.escape(g.psn)+"** | "+localtime);
        }
    );

    return bot.sendMessage(msg, toSend.join("\n"));

}

module.exports = {
    desc: 'lookup players for a game',
    name: 'players',
    usage: 'players <game-id>',
    alias: [],
    exec: exec
};