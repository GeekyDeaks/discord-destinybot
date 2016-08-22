'use strict';

var co = require('co');
//var psn = require('../psn');
var md = require('../../../markdown');
var api = require('../api');
var membership = require('../membership');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;


function exec(cmd) {

    return co(function* () {

        var msg = cmd.msg;
        var memType = membership.type(cmd);
        var name;
        var busyMsg;

        try {

            // figure out the username
            if(msg.mentions.length > 0) {
                name = msg.mentions[0].username;
            } else {
                name = cmd.args[0] || cmd.msg.author.username;
            }

            // sometimes we get the @ come through..
            name = name.replace(/^@/, '');

            //var gamer = psn.lookup(name);
            //if (gamer) {
            //    name = gamer.psn;
            //}

            if(!name) {
                // should not really get here...
                return message.send(msg, "did you forget something?", cmd.isPublic, 10000);
            }

            busyMsg = yield message.send(msg, ":mag: Looking up **"+md.escape(name)+"**", cmd.isPublic);
            var c = yield api.search(memType, name);
            if(!c.length) {
                return message.update(busyMsg, 
                    "Sorry, bungie does not seem to know anything about **"+md.escape(name)+"**", 10000);
            }
            var stats = yield api.stats(memType, c[0].membershipId);
            name = c[0].displayName;

            var pve = stats.mergedAllCharacters.results.allPvE.allTime;
            var pvp = stats.mergedAllCharacters.results.allPvP.allTime;

            var toSend = [];
            var firstline;
            //toSend.push("**"+md.escape(name)+"**");
            if (pve) {
                firstline = "━━ "+name+" / PvE ";
                firstline += "━".repeat(40 - firstline.length);
                toSend.push("```ruby\n"+
                    firstline + "\n" +
                    "         Time Played: " + pve.secondsPlayed.basic.displayValue + "\n" +
                    " Highest Light Level: " + pve.highestLightLevel.basic.displayValue + "\n" +
                    "                 KPD: " + pve.killsDeathsRatio.basic.displayValue + "\n" +
                    "     Precision Kills: " + pve.precisionKills.basic.displayValue + "\n" +
                    "         Best Weapon: " + pve.weaponBestType.basic.displayValue + "\n" +
                    "```"
                );                
            }
            if (pvp) {
                firstline = "━━ "+name+" / PvP ";
                firstline += "━".repeat(40 - firstline.length);
                toSend.push("```ruby\n"+
                    firstline + "\n" +
                    "         Time Played: " + pvp.secondsPlayed.basic.displayValue + "\n" +
                    " Highest Light Level: " + pvp.highestLightLevel.basic.displayValue + "\n" +
                    "                 KPD: " + pvp.killsDeathsRatio.basic.displayValue + "\n" +
                    "     Precision Kills: " + pvp.precisionKills.basic.displayValue + "\n" +
                    "         Best Weapon: " + pvp.weaponBestType.basic.displayValue + "\n" +
                    "      Win Loss Ratio: " + pvp.winLossRatio.basic.displayValue + "\n" +
                    "       Longest Spree: " + pvp.longestKillSpree.basic.displayValue + "\n" +
                    "```"
                );     
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