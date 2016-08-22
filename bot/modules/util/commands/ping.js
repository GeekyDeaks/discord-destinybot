'use strict';
var co = require('co');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;

function exec(cmd) {

    return co(function* () {
        var msg = cmd.msg;
        var sentMsg = yield message.send(msg, "pong", cmd.isPublic);
        return message.update(sentMsg, "pong   |   Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms");
    });

}

module.exports = {
    desc: 'Report approximate response time',
    name: 'ping',
    usage: undefined,
    alias: ['p'],
    exec: exec
};