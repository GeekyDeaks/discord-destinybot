'use strict';

var logger = require('winston');
var fs = require('fs');
var path = require('path');
var co = require('co');

var app = require.main.exports;
var config = app.config;

// we need to do this before anything else
// as other modules may create a reference to app.bot
var Discord = require('discord.js');
var bot = new Discord.Client({ maxCachedMessages: 1000, forceFetchUsers: true });
app.bot = bot;
app.commands = require('./commands');

// event listeners
bot.on("error", function (msg) {
    logger.error(msg);
    // should we throw here?
});

bot.on("warn", function (msg) {
    logger.warn(msg);
});

bot.on("debug", function (msg) {
    logger.debug(msg);
});

bot.once("ready", function () {
    bot.setPlayingGame("Global Thermonuclear War with WOPR");
    logger.info("%s is ready!", bot.internal.user.username);
    logger.verbose("Listening to %s channels on %s servers", bot.channels.length, bot.servers.length);
});

bot.on("disconnected", function () {
    logger.info("Disconnected from discord");
});

function init() {
    return co(function* () {
        var mods = Object.keys(config.modules);
        for(var m = 0; m < mods.length; m++) {
            logger.debug("loading module: %s", mods[m]);
            var module;
            try {
                module = require(path.join(__dirname, 'modules', mods[m]));
                yield module.init();
            } catch (err) {
                logger.error("Failed to load '%s':", mods[m], err);
                // do we throw and abort the entire load?
            }
        }

    });
}

function login() {

    return co(function* () {

        var token = yield bot.loginWithToken(config.discord.token);
        if (!token) {
            throw new Error("Failed to acquire token");
        }
        logger.info("Logged into discord with token: ", token);
    });

}

module.exports.login = login;
module.exports.init = init;