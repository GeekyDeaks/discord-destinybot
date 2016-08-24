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
            return message.send(msg, "did you forget something?", cmd.isPublic, 10000);
        }

        var gamer = yield db.collection(config.modules.gamer.collection).findOne({ discord: name });
        if (!gamer) {
            return message.send(msg, "Sorry, could not find **" + md.escape(name) + "**", cmd.isPublic, 10000);
        }

        var toSend = ["```ruby"];
            toSend.push("Discord ID: @" + gamer.discord);
        if(gamer.psn)
            toSend.push("       PSN: " + gamer.psn);
        if(gamer.xbl)
            toSend.push("       XBL: " + gamer.xbl);
        if(gamer.games)
            toSend.push("     Games: " + gamer.games.join(", "));
        // get joined at timestamp
        var user = bot.users.get("username", gamer.discord);
        if (user) {
            var detailsOf = server.detailsOfUser(user);
            joinedAt = new Date(detailsOf.joinedAt).toISOString();
            toSend.push(" Joined At: " + joinedAt);
        }
        
        if(gamer.tz && moment.tz.zone(gamer.tz)) {
            toSend.push(" Localtime: " + now.tz(gamer.tz).format("HH:mm (Z z)"));
        } else if(gamer.tz) {
            toSend.push("  Timezone: " + gamer.tz);
        }
        toSend.push("```");

        return message.send(msg, toSend, cmd.isPublic);

    });

}

module.exports = {
    desc: 'Lookup gamer details for a discord account',
    name: 'gamer',
    usage: '`gamer <@discord-id>`',
    alias: ['psn', 'xbl'],
    exec: exec
};