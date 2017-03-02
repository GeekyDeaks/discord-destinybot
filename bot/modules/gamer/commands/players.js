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
        var server = msg.guild || app.defaultServer;
        var user;

        if (!game) {
            return message.send(msg, "did you forget something " + msg.author +"?", cmd.pm, 10000);
        }

        var busyMsg = yield message.send(msg, ":mag: Looking up players for **"+md.escape(game)+"**", cmd.pm);

        // make sure we have all the members
        yield server.fetchMembers();

        // perhaps change this to 'if contains X' kinda deal in conjunction with the role check further below
        // so that we capture all aliases (e.g. OW, OW(PS4), OW (PS4/PC))?  ~LMG
        var all = (game.toUpperCase() === 'ANY' || game.toUpperCase() === 'ALL');
        var p;
        if(all) {
            p = yield db.collection(config.modules.gamer.collection).
                find().
                sort({"discord.name" : 1}).
                toArray();
        } else {
            p = yield db.collection(config.modules.gamer.collection).
                find({ games : { $regex: '^'+game+'$', $options : 'i' }}).
                sort({"discord.name" : 1}).
                toArray();
        }

        if (!p || p.length === 0) {
            return message.update(busyMsg, "Sorry " + msg.author + ", I could not find any players for **" + game + "**", 10000);
        }

        var toSend = ["```" + cmd.format + "\n━━ "+game+" players ━━━━━━━━━━━━━━━━━━━━━```"];
        var g;
        var line = [];
        while (g = p.shift()) {

            var member = g.discord.id ? server.members.get(g.discord.id) : null;

            if(all) {
                // bunch of checks to see if the user is subscribed to the server
                if(!member) continue;
                // do we need to check if they are in a specific role?
                // perhaps do a check against users own role so we only show players on same platform? ~LMG
                if(config.modules.gamer.memberRole &&
                    !member.roles.exists("name", config.modules.gamer.memberRole)) continue;
            }

            line = ["```" + cmd.format];
            if(member && member.nickname) {
                line.push("Discord ID: @" + g.discord.name + " (" + member.nickname + ")");
            } else {
                line.push("Discord ID: @" + g.discord.name);
            }

            if (g.psn)
            line.push("                  PSN: " + g.psn);
            if (g.xbl)
            line.push("                  XBL: " + g.xbl);
            if (g.fc)
            line.push("       3DS Friend Code: " + g.fc);
            if (g.mn)
            line.push("           My Nintendo: " + g.mn);
            if (g.steam)
            line.push("              Steam: " + g.steam);
            if (g.uplay)
            line.push("              Uplay: " + g.uplay);
            if (g.origin)
            line.push("            Origin: " + g.origin);
            if (g.bn)
            line.push("            battle.net: " + g.bn);
            if (g.lol)
            line.push("                  LoL: " + g.lol);
            if (all)
            line.push("     GAMES: " + g.games.join(", "));
            if (g.tz && moment.tz.zone(g.tz)) {
                line.push(" Localtime: " + now.tz(g.tz).format("HH:mm (Z z)"));
            } else if (g.tz) {
                line.push("  Timezone: " + g.tz);
            }
            line.push("```");

            toSend.push(line.join("\n"));

        }

        return message.update(busyMsg, toSend);
    });

}

module.exports = {
    desc: 'lookup players for a game',
    name: 'players',
    usage: '`players <game-id>`',
    alias: [],
    exec: exec
};
