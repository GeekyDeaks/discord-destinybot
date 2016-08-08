'use strict';
var co = require('co');

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var sentMsg = yield bot.sendMessage(msg, "pong");
        return bot.updateMessage(sentMsg, "pong   |   Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms");
    });

}

module.exports = {
    desc: 'Report approximate response time',
    name: 'ping',
    usage: undefined,
    alias: ['p'],
    exec: exec
};