'use strict';

var co = require('co');
var psn = require('../psn');
var md = require('../markdown');

function exec(cmd) {

   return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var config = cmd.config;

        var busyMsg = yield bot.sendMessage(msg, "Parsing #" + config.discord.psnChannel + " :stopwatch:");

        yield psn.scrape(bot);

        var toSend = [];

        toSend.push("Parsed #"+ config.discord.psnChannel);
        toSend.push("Users: **"+Object.keys(psn.gamers).length+"** | Errors: **"+psn.errors.length+"**");
        if(psn.errors.length) {
            toSend.push("---- **"+psn.errors.length+"** Parsing Error(s) ------------------");
            psn.errors.forEach(function (e) {
                toSend.push(md.escape(e));
            })
        }

        if(psn.warnings.length) {
            toSend.push("---- **"+psn.warnings.length+"** Parsing Warnings(s) ------------------");
            psn.warnings.forEach(function (w) {
                toSend.push(md.escape(w));
            })
        }

        // scan through the list of Users
        var missing = [];
        bot.users.forEach(function (u) {
            if(u.bot) return; // skip the bots
            if(!psn.gamers[u.username]) {
                missing.push(u.username);
            } 
        });

        if (missing.length) {
            toSend.push("---- **" + missing.length + "** Missing discord tag(s) ------------------");
            missing.sort().forEach(function (u) {
                toSend.push(md.escape(u));
            })
        }

        var report = toSend.join("\n");
        if(report.length > 1930) {
            bot.sendMessage(msg, "too many problems to report fully :warning:")
        }

        yield bot.updateMessage(busyMsg, report.substr(0, 1930));

    });

}

module.exports = {
    desc: 'Reload PSN database',
    name: 'reload',
    usage: undefined,
    alias: [],
    exec: exec
};