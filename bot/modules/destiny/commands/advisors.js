'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var api = require('../api');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;

function exec(cmd) {

    return co(function *() {

        var msg = cmd.msg;
        var busyMsg;
        var pve = {};
        var pvp = {};

        busyMsg = yield bot.sendMessage(msg, "Pulling latest Destiny Daily and Weekly Advisors"+"** :mag:");

        var advisor = yield api.advisor();
        var activities = advisor.data.activities;
        var categories = advisor.data.activityCategories;

        for (let i in categories) {
            console.log(i)
        }

    })

}

module.exports = {
    desc: 'Get list of daily and weekly advisors',
    name: 'advisor',
    alias: ['ad'],
    exec: exec
}