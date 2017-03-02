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
            toSend.push("         Discord ID: @" + g.discord.name);
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
                toSend.push("           battle.net: " + g.bn);
            if (g.lol)
                toSend.push("                LoL: " + g.lol);
            if (g.games)
                toSend.push("              Games: " + g.games.join(", "));
            // get joined at timestamp
            var user = yield bot.fetchUser(g.discord.id);
            if (user) {
                var member = server.member(user);
                if (member) {
                    toSend.push("          Joined At: " + member.joinedAt.toISOString());
                }
            }

            if (g.tz && moment.tz.zone(g.tz)) {
                toSend.push("          Localtime: " + now.tz(g.tz).format("HH:mm (Z z)"));
            } else if (g.tz) {
                toSend.push("           Timezone: " + g.tz);
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
                    return message.send(msg, "Updated XBL Tag to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed XBL Tag", cmd.pm);
                }


            case 'psn':
            case 'playstation':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { psn: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated PSN ID to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed PSN ID", cmd.pm);
                }

            case 'fc':
            case 'friendcode':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { fc: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated 3DS Friend Code to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed 3DS Friend Code ", cmd.pm);
                }

            case 'mn':
            case 'nintendo':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { mn: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated My Nintendo username to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed My Nintendo username", cmd.pm);
                }

            case 'steam':
            case 'steam':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { steam: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated Steam username to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed Steam username", cmd.pm);
                }

            case 'uplay':
            case 'uplay':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { uplay: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated Uplay username to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed Uplay username", cmd.pm);
                }


            case 'origin':
            case 'origin':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { origin: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated Origin username to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed Origin username", cmd.pm);
                }


            case 'bn':
            case 'battlenet':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { bn: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated battle.net username to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed battle.net username", cmd.pm);
                }

            case 'lol':
            case 'leagueoflegends':
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { lol: args[0], "discord.name" : msg.author.username, modified: true } },
                    { upsert: true }
                );
                if(args[0]) {
                    return message.send(msg, "Updated League of Legends username to: "+args[0], cmd.pm);
                } else {
                    return message.send(msg, "Removed League of Legends username", cmd.pm);
                }



            case 'game':
            case 'games':
                if(!args.length) return message.send(msg, "Sorry "+ msg.author + ", there are no games specified", cmd.pm, 10000);
                var game;
                var line = [];
                while(game = args.shift()) {
                    var mod;
                    var gname;
                    [ , mod, gname] = game.match(/^([-+])?(.*)$/);
                    if(mod && game && mod === '-') {
                        // remove the game
                        yield db.collection(config.modules.gamer.collection).updateOne(
                            { "discord.id": msg.author.id },
                            { $pull: { games: gname } }
                        );
                        line.push("Removed game: `"+gname+"`");
                    } else if(gname) {
                        // assume it was add
                        yield db.collection(config.modules.gamer.collection).updateOne(
                            { "discord.id": msg.author.id },
                            { $addToSet: { games: gname } }
                        );
                        line.push("Added game: `"+gname+"`");
                    } else {
                        line.push("Sorry, did not know how to handle: `" + game + "`");
                    }

                }
                return message.send(msg, line, cmd.pm);
            case 'tz':
            case 'timezone':
                if(!args.length) return message.send(msg, "Sorry "+ msg.author + ", the `timezone` is missing", cmd.pm, 10000);
                if (!moment.tz.zone(args[0])) {
                    return message.send(
                        msg,
                        [
                            "Sorry "+ msg.author + ", the timezone `" + args[0] +"` is not recgonised.",
                            "Please see the **TZ** column at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for a list"
                        ],
                        cmd.pm, 10000
                    );
                }
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { tz: args[0], "discord.name": msg.author.username, modified: true } },
                    { upsert: true }
                );
                return message.send(msg, "Updated TZ to: " + args[0], cmd.pm);
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
            "\t\t`fc <3ds fc>` - set your 3ds friendcode",
            "\t\t`mn <mn>` - set your my nintendo username",
            "\t\t`steam <steam username>` - set your steam username",
            "\t\t`uplay <uplay username>` - set your uplay username",
            "\t\t`origin <origin username>` - set your origin username",
            "\t\t`bn <battle.net username>` - set your battle.net username",
            "\t\t`lol <LoL username>` - set your league of legends username",
            "\t\t`tz <timezone>` - set your timezone",
            "\t\t`game [+game]|[-game]` - add or remove a game"],
    alias: [],
    exec: exec,
    admin: false
};
