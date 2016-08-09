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
            toSend.push("---- Parsing Errors ------------------");
            psn.errors.forEach(function (e) {
                toSend.push(md.escape(e));
            })
        }
        // scan through the list of Users
        toSend.push("---- Missing discord tags ----------");
        bot.users.forEach(function (u) {
            if(u.bot) return; // skip the bots

            if(!psn.gamers[u.username]) {
                toSend.push(md.escape(u.username));
            } 

        });


        return bot.updateMessage(busyMsg, toSend.join("\n"));

    });

}

module.exports = {
    desc: 'Reload PSN database',
    name: 'reload',
    usage: undefined,
    alias: [],
    exec: exec
};