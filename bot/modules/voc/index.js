'use strict';

var logger = require('winston');
var co = require('co');
var parse = require('./parse');
var app = require.main.exports;
var commands = app.commands;
var bot = app.bot;
var config = app.config;
var mvote;

function init(bot) {
    logger.debug("init voc module");

    // load the commands
    try {
         commands.load(__dirname);
    } catch (err) {
        logger.error("failed whilst loading voc commands: ", err);
    }

    // see if we have mvote enabled
    if(config.modules.voc.mvote) {
        mvote = require('./mvote');
    }

    return Promise.resolve();
}

// only start listening for commands once we are all fired up
bot.once("ready", function () {

    bot.on("messageUpdated", function (msg0, msg1) {
        parseMessage(msg1);
    })

    bot.on("message", parseMessage);

});

function parseMessage(msg) {
    return co(function* () {

        if(msg.author.bot) return;

        if(msg.channel.name === config.modules.voc.psnChannel) {
            logger.debug("got message in channel %s: ",msg.channel.name, msg.content);
            return parse.update(msg);
        }

        if(msg.channel.type === 'dm' && mvote) {
            // look for the yes response
            return mvote.parseMsg(msg);
        }
    });

}

module.exports.init = init;