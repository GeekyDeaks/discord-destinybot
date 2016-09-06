'use strict';
var co = require('co');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;


function exec(cmd) {

    return co(function* () {
        var msg = cmd.msg;
        var url = config.modules.voc.rules.url;

        if(!url) {
            return message.send(msg, "sorry, no rules URL defined", cmd.pm, 10000);
        }
        return message.send(msg, url, cmd.pm);

    });
}

module.exports = {
    desc: 'Show the rules URL',
    name: 'rules',
    usage: [],
    alias: [],
    exec: exec
};