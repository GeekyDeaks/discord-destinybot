'use strict';

var co = require('co');
var psn = require('../psn');
var md = require('../markdown');

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var config = cmd.config;
        var name;
        var busyMsg;

        try {
            // figure out the username
            if(msg.mentions.length > 0) {
                var gamer = psn.lookup(msg.mentions[0].username);
                if(gamer) {
                    name = gamer.psn;
                }
            } else {
                name = cmd.args[0];
            }

            if(!name) {
                return bot.sendMessage(msg, "did you forget something?");
            }

            busyMsg = yield bot.sendMessage(msg, "Looking up **"+md.escape(name)+"** :mag:");

            var stats = yield cmd.destiny.stats(config.destiny.defaultType, name);
            var pve = stats.Response.mergedAllCharacters.results.allPvE.allTime;
            var pvp = stats.Response.mergedAllCharacters.results.allPvP.allTime;

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

            return bot.updateMessage(busyMsg, toSend.join("\n"));
        } catch (err) { 
            var errmsg;
            if(err.message.match(/UserCannotResolveCentralAccount/)) {
                errmsg = "Sorry, bungie does not seem to know anything about **"+md.escape(name)+"**";
            } else {
                errmsg = "sorry, something unexpected happened: ```"+err+"```";
            }
    
            if(busyMsg) {
                bot.updateMessage(busyMsg, errmsg);
            } else {
                bot.sendMessage(msg, errmsg);
            }
        }
    });

}

module.exports = {
    desc: 'Get Destiny player stats',
    name: 'stats',
    usage: 'stats <psn-id>|<@discord-id>',
    alias: ['s'],
    exec: exec
};