'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var md = require('../../../markdown');
var moment = require('moment-timezone');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

function exec(cmd) {

    return co(function* (){

        var msg = cmd.msg;
        var game = cmd.args[0];
        var now = moment();

        if (!game) {
            return message.send(msg, "did you forget something " + msg.author +"?", cmd.pm, 10000);
        }

        var regex = { $regex: '^'+game+'$', $options : 'i' };

        var p = yield db.collection(config.modules.gamer.collection).find({ games : regex}).sort({"discord.name" : 1}).toArray();

        if (!p || p.length === 0) {
            return message.send(msg, "Sorry " + msg.author + ", I could not find any players for **" + game + "**", cmd.pm, 10000);
        }

        var toSend = ["```" + cmd.format + "\n━━ "+game+" players ━━━━━━━━━━━━━━━━━━━━━```"];
        var g;
        var line = [];
        while (g = p.shift()) {

            line = ["```" + cmd.format];
            line.push("Discord ID: @" + g.discord.name);
            if (g.psn)
                line.push("       PSN: " + g.psn);
            if (g.xbl)
                line.push("       XBL: " + g.xbl);
            if (g.tz && moment.tz.zone(g.tz)) {
                line.push(" Localtime: " + now.tz(g.tz).format("HH:mm (Z z)"));
            } else if (g.tz) {
                line.push("  Timezone: " + g.tz);
            }
            line.push("```");

            toSend.push(line.join("\n"));

        }

        return message.send(msg, toSend, cmd.pm);
    });

}

module.exports = {
    desc: 'lookup players for a game',
    name: 'players',
    usage: '`players <game-id>`',
    alias: [],
    exec: exec
};