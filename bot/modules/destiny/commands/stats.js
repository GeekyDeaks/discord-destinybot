'use strict';

var co = require('co');
//var psn = require('../psn');
var md = require('../../../markdown');
var api = require('../api');
var membership = require('../membership');
var message = require('../../../message');
var gamer = require('../../gamer');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;


function stats(type, name) {
    return co(function* () {

        var m = yield api.search(type, name);
        if(!m.length) return;

        var stats = yield api.stats(type, m[0].membershipId);
        if(!stats) return;

        var pve = stats.mergedAllCharacters.results.allPvE.allTime;
        var pvp = stats.mergedAllCharacters.results.allPvP.allTime;

        var toSend = [];
        var line = [];

        if (pve) {
            line[0] = "```ruby";
            line[1] = "━━ " + membership.name(type) + " / " + m[0].displayName + " / PvE ";
            line[1] += "━".repeat(40 - line[1].length);
            line.push("         Time Played: " + pve.secondsPlayed.basic.displayValue);
            line.push(" Highest Light Level: " + pve.highestLightLevel.basic.displayValue);
            line.push("                 KPD: " + pve.killsDeathsRatio.basic.displayValue);
            line.push("     Precision Kills: " + pve.precisionKills.basic.displayValue);
            line.push("         Best Weapon: " + pve.weaponBestType.basic.displayValue);
            line.push("```");
            toSend.push(line.join("\n"));
        }
        
        if (pvp) {
            line.length = 0;
            line[0] = "```ruby";
            line[1] = "━━ " + membership.name(type) + " / " + m[0].displayName + " / PvP ";
            line[1] += "━".repeat(40 - line[1].length);
            line.push("         Time Played: " + pvp.secondsPlayed.basic.displayValue);
            line.push(" Highest Light Level: " + pvp.highestLightLevel.basic.displayValue);
            line.push("                 KPD: " + pvp.killsDeathsRatio.basic.displayValue);
            line.push("     Precision Kills: " + pvp.precisionKills.basic.displayValue);
            line.push("         Best Weapon: " + pvp.weaponBestType.basic.displayValue);
            line.push("      Win Loss Ratio: " + pvp.winLossRatio.basic.displayValue);
            line.push("       Longest Spree: " + pvp.longestKillSpree.basic.displayValue);
            line.push("```");
            toSend.push(line.join("\n"));            

        }
        return toSend;
    });
}


function exec(cmd) {

    return co(function* () {

        var msg = cmd.msg;
        var memType = membership.type(cmd);
        var name;
        var busyMsg;
        var xbl;
        var psn;

        try {

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

            // we should get here pretty quick
            busyMsg = yield message.send(msg, ":mag: Looking up **"+md.escape(name)+"**", cmd.isPublic);

            if(g) {
                xbl = g.xbl;
                psn = g.psn;
            } else {
                xbl = name;
                psn = name;
            }

            var toSend = [];
            var mt;
            var out;
            while(mt = memType.shift()) {
                //
                out = undefined;
                switch(mt) {
                    case membership.XBL:
                        if(xbl)
                            out = yield stats(membership.XBL, xbl);
                        break;
                    case membership.PSN:
                        if(psn) 
                            out = yield stats(membership.PSN, psn);
                        break;
                }
                // concat the array in place
                // http://stackoverflow.com/questions/4156101/javascript-push-array-values-into-another-array
                if(out) toSend.push.apply(toSend, out);
            }
            
            if(!toSend.length) {
                return message.update(busyMsg, 
                    "Sorry, bungie does not seem to know anything about **"+md.escape(name)+"**", 10000);
            }

            return message.update(busyMsg, toSend);

        } catch (err) { 
            var errmsg = "sorry, something unexpected happened: ```"+err+"```";

            if(busyMsg) {
                message.update(busyMsg, errmsg, 10000);
            } else {
                message.send(msg, errmsg, cmd.isPublic, 10000);
            }
        }
    });

}

module.exports = {
    desc: 'Get Destiny player stats',
    name: 'stats',
    usage: '`stats [xbl|psn] <xbl-id>|<psn-id>|<@discord-id>`',
    alias: ['s'],
    exec: exec
};