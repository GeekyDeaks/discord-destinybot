'use strict';

var co = require('co');

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var config = cmd.config;
        var channel = msg.channel;



        try {
            // this does not work if multiple requests are outstanding...
            // need to think about caching the status
            bot.startTyping(msg);

            //var busyMsg = yield bot.sendMessage(msg, "looking up stats for " + cmd.args[0] + "....");

            var stats = yield cmd.destiny.stats(config.destiny.defaultType, cmd.args[0]);
            var pve = stats.Response.mergedAllCharacters.results.allPvE.allTime;
            var pvp = stats.Response.mergedAllCharacters.results.allPvP.allTime;

            var toSend = [];
            toSend.push("**"+cmd.args[0]+"**");
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


            bot.stopTyping(msg);
            return bot.sendMessage(msg, toSend.join("\n"));
        } catch (err) {
            bot.sendMessage(msg, err);
            bot.stopTyping(msg);
        }
    });

}

module.exports = {
    desc: 'Get player stats',
    name: 'stats',
    usage: 'stats [xbl|psn] <id>',
    alias: ['s'],
    exec: exec
};