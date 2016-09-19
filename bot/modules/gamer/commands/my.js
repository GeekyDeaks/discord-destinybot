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
        var args = cmd.args;
        var server = msg.guild || app.defaultServer;
        var now = moment();

        var option = args.shift();

        if(!option) {
            // display the user?
            var name = cmd.msg.author.username;
            var g = yield gamer.findById(cmd.msg.author.id);
            if (!g) {
                return message.send(msg, "Sorry " + msg.author + ", I could not find your gamer details", cmd.pm, 10000);
            }

            var toSend = ["```" + cmd.format];
            toSend.push("Discord ID: @" + g.discord.name);
            if (g.psn)
                toSend.push("       PSN: " + g.psn);
            if (g.xbl)
                toSend.push("       XBL: " + g.xbl);
            if (g.games)
                toSend.push("     Games: " + g.games.join(", "));
            // get joined at timestamp
            var user = yield bot.fetchUser(g.discord.id);
            if (user) {
                var member = server.member(user);
                if (member) {
                    toSend.push(" Joined At: " + member.joinDate.toISOString());
                }
            }

            if (g.tz && moment.tz.zone(g.tz)) {
                toSend.push(" Localtime: " + now.tz(g.tz).format("HH:mm (Z z)"));
            } else if (g.tz) {
                toSend.push("  Timezone: " + g.tz);
            }
            toSend.push("```");

            return message.send(msg, toSend, cmd.pm);

        }

        switch(option.toLowerCase()) {
            case 'xbl':
            case 'xbox':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { xbl: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated XBL Tag to: "+args[0]);
                } else {
                    return message.send(msg, "Removed XBL Tag");
                }
                
            case 'psn':
            case 'playstation':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { psn: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated PSN ID to: "+args[0]);
                } else {
                    return message.send(msg, "Removed PSN ID");
                }

            case 'game':
            case 'games':
                if(!args.length) return message.send(msg, "Sorry "+ msg.author + ", there are no games specified", cmd.pm, 10000);
                break;
            case 'tz':
            case 'timezone':
                if(!args.length) return message.send(msg, "Sorry "+ msg.author + ", the `timezone` is missing", cmd.pm, 10000);
                break;
            default:
                return message.send(msg, "sorry " + msg.author + ", I don't understand `"+option+"`", cmd.pm, 10000);

        }
        
    });

}

module.exports = {
    desc: 'Set/Edit your gamer info',
    name: 'my',
    usage: ["",  // this causes a CR
            "\t\t`xbl <xbl gamertag>` - set your xbl gamertag",
            "\t\t`psn <psn id>` - set your psn id",
            "\t\t`tz <timezone>` - set your timezone",
            "\t\t`game [+game]|[-game]` - add or remove a game"],
    alias: [],
    exec: exec,
    admin: true
};