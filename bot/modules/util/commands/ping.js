'use strict';
var co = require('co');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;

function exec(cmd) {

    return co(function* () {
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