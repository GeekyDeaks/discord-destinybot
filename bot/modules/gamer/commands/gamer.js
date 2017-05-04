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

        var server = msg.guild || app.defaultServer;
        var g;

        // figure out the username
        if (msg.mentions.users.size > 0) {
            var fm = msg.mentions.users.first();
            name = fm.username;
            g = yield gamer.findById(fm.id);
        } else if(cmd.args[0]) {
            name = cmd.args[0].replace(/^@/, '');
            g = yield gamer.findOneByName(name);
        } else {
            name = cmd.msg.author.username;
            g = yield gamer.findById(cmd.msg.author.id);
        }

        if (!g) {
            return message.send(msg, "Sorry " + msg.author +", I could not find `" + name + "`. Are you sure that they've set a nickname or username for one of the platforms?", cmd.pm, 10000);
        }

        var toSend = ["```" + cmd.format];
            toSend.push("Discord ID: @" + g.discord.name);
            if (g.psn)
                toSend.push("                PSN: " + g.psn);
            if (g.xbl)
                toSend.push("                XBL: " + g.xbl);
            if (g.fc)
                toSend.push("    3DS Friend Code: " + g.fc);
            if (g.mn)
                toSend.push("        My Nintendo: " + g.mn);
            if (g.steam)
                toSend.push("              Steam: " + g.steam);
            if (g.uplay)
                toSend.push("              Uplay: " + g.uplay);
            if (g.origin)
                toSend.push("             Origin: " + g.origin);
            if (g.bn)
                toSend.push("         battle.net: " + g.bn);
            if (g.lol)
                toSend.push("                LoL: " + g.lol);
            if (g.games)
                toSend.push("              Games: " + g.games.join(", "));
        // get joined at timestamp
        var user = yield bot.fetchUser(g.discord.id);
        if (user) {
            var member = server.member(user);
            if (member) {
                toSend.push(" Joined At: " + member.joinedAt.toISOString());
            }
        }

        if(g.tz && moment.tz.zone(g.tz)) {
            toSend.push(" Localtime: " + now.tz(g.tz).format("HH:mm (Z z)"));
        } else if(g.tz) {
            toSend.push("  Timezone: " + g.tz);
        }
        toSend.push("```");

        return message.send(msg, toSend, cmd.pm);

    });

}

module.exports = {
    desc: 'Lookup g details for a discord account',
    name: 'gamer',
    usage: '`gamer <@discord-id>`',
    alias: ['psn', 'xbl', 'fc', 'mn', 'steam', 'uplay', 'origin', 'bn', 'lol'],
    exec: exec
};
