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
            toSend.push("**"+md.escape(name)+"**");
            if (pve) {
                toSend.push("-------------------------------");
                toSend.push('**PvE Stats**');
                toSend.push('Days Played: **' + pve.secondsPlayed.basic.displayValue + '**');
                toSend.push('Highest Light Lvl: **' + pve.highestLightLevel.basic.displayValue + '**');
                toSend.push('KPD: **' + pve.killsDeathsRatio.basic.displayValue + '**');
                toSend.push('Precision Kills: **' + pve.precisionKills.basic.displayValue + '**');
                toSend.push('Best Weapon: **' + pve.weaponBestType.basic.displayValue + '**');
                
            }
            if (pvp) {
                toSend.push("-------------------------------");
                toSend.push('**PvP Stats**');
                toSend.push('Days Played: **' + pvp.secondsPlayed.basic.displayValue + '**');
                toSend.push('Highest Light Lvl: **' + pvp.highestLightLevel.basic.displayValue + '**');
                toSend.push('KPD: **' + pvp.killsDeathsRatio.basic.displayValue + '**');
                toSend.push('Precision Kills: **' + pvp.precisionKills.basic.displayValue + '**');
                toSend.push('Best Weapon: **' + pvp.weaponBestType.basic.displayValue + '**');
                toSend.push('Win Loss Ratio: **' + pvp.winLossRatio.basic.displayValue + '**');
                toSend.push('Longest Spree: **' + pvp.longestKillSpree.basic.displayValue + '**');
            }

            return bot.updateMessage(busyMsg, toSend.join("\n"));
        } catch (err) { 
            var errmsg;
            if(err.message.match(/UserCannotResolveCentralAccount/)) {
                errmsg = "Sorry, bungie does not seem to know anything about **"+md.escape(name)+"**";
            } else {
                errmsg = "sorry, something unexpected happened: _"+err+"_";
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