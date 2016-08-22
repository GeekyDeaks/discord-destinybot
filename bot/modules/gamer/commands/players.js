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
            return message.send(msg, "did you forget something?", cmd.isPublic, 10000);
        }

        var p = yield db.collection(config.modules.gamer.collection).find({ games : game}).sort({"discord" : 1}).toArray();

        if (!p || p.length === 0) {
            return message.send(msg, "Sorry, could not find any players for **" + game + "**", cmd.isPublic, 10000);
        }

        var toSend = ["```ruby\n━━ "+game+" players ━━━━━━━━━━━━━━━━━━━━━```"];
        var g;
        while (g = p.shift()) {
            var localtime;
            // figure out the Localtime
            if (g.tz && moment.tz.zone(g.tz)) {
                localtime = " Localtime: " + now.tz(g.tz).format("HH:mm (Z z)");
            } else {
                localtime = "  Timezone: " + g.tz;
            }

            toSend.push("```ruby\n" +
                "Discord ID: @" + g.discord + "\n" +
                "       PSN: " + g.psn + "\n" +
                localtime + "```");

        }

        return message.send(msg, toSend, cmd.isPublic);
    });

}

module.exports = {
    desc: 'lookup players for a game',
    name: 'players',
    usage: '`players <game-id>`',
    alias: [],
    exec: exec
};