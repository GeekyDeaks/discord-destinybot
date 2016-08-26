'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var md = require('../../../markdown');
var moment = require('moment-timezone');
var message = require('../../../message');
var gamer = require('../index');

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

        var g;

        // figure out the username
        if (msg.mentions.length > 0) {
            name = msg.mentions[0].username;
            g = yield gamer.findById(msg.mentions[0].id);
        } else if(cmd.args[0]) {
            name = cmd.args[0].replace(/^@/, '');
            g = yield gamer.findOneByName(name);
        } else {
            name = cmd.msg.author.username;
            g = yield gamer.findById(cmd.msg.author.id);
        }

        if (!g) {
            return message.send(msg, "Sorry, could not find **" + md.escape(name) + "**", cmd.isPublic, 10000);
        }

        var toSend = ["```ruby"];
            toSend.push("Discord ID: @" + g.discord.name);
        if(g.psn)
            toSend.push("       PSN: " + g.psn);
        if(g.xbl)
            toSend.push("       XBL: " + g.xbl);
        if(g.games)
            toSend.push("     Games: " + g.games.join(", "));
        // get joined at timestamp
        var user = bot.users.get("id", g.discord.id);
        if (user) {
            var detailsOf = server.detailsOfUser(user);
            joinedAt = new Date(detailsOf.joinedAt).toISOString();
            toSend.push(" Joined At: " + joinedAt);
        }
        
        if(g.tz && moment.tz.zone(g.tz)) {
            toSend.push(" Localtime: " + now.tz(g.tz).format("HH:mm (Z z)"));
        } else if(g.tz) {
            toSend.push("  Timezone: " + g.tz);
        }
        toSend.push("```");

        return message.send(msg, toSend, cmd.isPublic);

    });

}

module.exports = {
    desc: 'Lookup g details for a discord account',
    name: 'gamer',
    usage: '`gamer <@discord-id>`',
    alias: ['psn', 'xbl'],
    exec: exec
};