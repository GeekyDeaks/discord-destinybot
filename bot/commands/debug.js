'use strict';

var co = require('co');
var util = require('util');

function* exec(cmd) {

    var bot = cmd.bot;
    var msg = cmd.msg;
    var author = msg.author;
    var mentions = msg.mentions;

    bot.sendMessage(msg, "nothing to see here - you need to be connected port 11894 :)")

}

module.exports = {
    desc: 'You really don\'t want to know...',
    name: 'debug',
    usage: '',
    alias: [],
    exec: exec,
    disabled: true
};