'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var api = require('../api');
var manifest = require('../manifest');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;

function exec(cmd) {

    return co(function *() {

        var msg = cmd.msg;
        var busyMsg;
        var daily = {};
        var weekly = {};

        busyMsg = yield bot.sendMessage(msg, "Pulling latest Destiny Daily and Weekly Advisors"+"** :mag:");

        var advisor = yield api.advisor();
        var activities = advisor.data.activities;
        var activityName = advisor.data.activities.display;
        var categories = advisor.data.activityCategories;


        for (let i in activityName) {
            console.log(i);
        }

    })

}

module.exports = {
    desc: 'Get list of daily and weekly advisors',
    name: 'advisor',
    alias: ['ad'],
    exec: exec
}