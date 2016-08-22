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
        var name = cmd.args[0];
        var now = moment();
        var joinedAt = 'Unknown';

        var server = msg.server || app.defaultServer;

        // mentions take precedent
        if (msg.mentions.length > 0) {
            name = msg.mentions[0].username;
        } else {
            name = cmd.args[0] || cmd.msg.author.username;
        }

        // sometimes we get the @ come through..
        name = name.replace(/^@/, '');

        if (!name) {
            // should not get here..
            return bot.sendMessage(msg, "did you forget something?");
        }

        var gamer = yield db.collection(config.modules.gamer.collection).findOne({ discord: name });
        if (!gamer) {
            return bot.sendMessage(msg, "Sorry, could not find **" + md.escape(name) + "**");
        }

        var localtime;
        // figure out the Localtime
        if (gamer.tz && moment.tz.zone(gamer.tz)) {
            localtime = " Localtime: " + now.tz(gamer.tz).format("HH:mm (Z z)");
        } else {
            localtime = "  Timezone: " + gamer.tz;
        }

        // get joined at timestamp
        var user = bot.users.get("username", gamer.discord);
        if (user) {
            var detailsOf = server.detailsOfUser(user);
            joinedAt = new Date(detailsOf.joinedAt).toUTCString();
        }

        return bot.sendMessage(msg, "```ruby\n" +
            "Discord ID: @" + gamer.discord + "\n" +
            "       PSN: " + gamer.psn + "\n" +
            "     Games: " + gamer.games.join(", ") + "\n" +
            " Joined At: " + joinedAt + "\n" +
            localtime + "```");

    });

}

module.exports = {
    desc: 'Lookup gamer details for a discord account',
    name: 'gamer',
    usage: '`gamer <@discord-id>`',
    alias: ['psn', 'xbl'],
    exec: exec
};