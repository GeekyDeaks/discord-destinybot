'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var md = require('../../../markdown');
var moment = require('moment-timezone');

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
            return bot.sendMessage(msg, "did you forget something?");
        }

        var p = yield db.collection(config.modules.gamer.collection).find({ games : game}).toArray();

        if (!p || p.length === 0) {
            return bot.sendMessage(msg, "Sorry, could not find any players for **" + game + "**");
        }

        var toSend = [];
        var line;
        var length = 0;
        var g;
        while (g = p.shift()) {
            var localtime;
            // figure out the Localtime
            if (g.tz && moment.tz.zone(g.tz)) {
                localtime = " Localtime: " + now.tz(g.tz).format("HH:mm (Z z)");
            } else {
                localtime = "  Timezone: " + g.tz;
            }

            line = "```ruby\n" +
                "Discord ID: @" + g.discord + "\n" +
                "       PSN: " + g.psn + "\n" +
                localtime + "```";


            if (length + line.length > 1930) {
                // push the current message
                bot.sendMessage(msg, toSend.join("\n"));
                length = 0;
                toSend.length = 0;
            }

            toSend.push(line);
            length += line.length;

        }


        return bot.sendMessage(msg, toSend.join("\n"));
    });

}

module.exports = {
    desc: 'lookup players for a game',
    name: 'players',
    usage: '`players <game-id>`',
    alias: [],
    exec: exec
};