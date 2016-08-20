'use strict';

var logger = require('winston');
logger.level = 'debug';
// fudge - by default winston disables timestamps on the console
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { prettyPrint: true, 'timestamp':true });

var config = require('./config');
config.pkg = require("./package.json");
module.exports.config = config;
var co = require('co');


var bot = require('./bot');

// start the bot
bot.init().then(bot.login)
.then(function () {
  logger.info("bot started");
})
.catch(function(err) {
    // thrown error propagates here automatically
    // because it was not caught.
    if (err)
        logger.error("Failed to login to discord", err);
});

