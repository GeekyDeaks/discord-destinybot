'use strict';

var co = require('co');

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var config = cmd.config;

        bot.startTyping(msg);

        //var busyMsg = yield bot.sendMessage(msg, "searching for " + cmd.args[0] + "....");

        var res = yield cmd.destiny.search(config.destiny.defaultType, cmd.args[0]);

        bot.stopTyping(msg);
        return bot.sendMessage(msg, "```" + JSON.stringify(res, null, 4) + "```");

    });



}

module.exports = {
    desc: 'Find player id',
    name: 'search',
    usage: 'search [xbl|psn] <id>',
    alias: [],
    exec: exec
};