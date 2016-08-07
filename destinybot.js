'use strict';

var logger = require('winston');
logger.level = 'debug';
// fudge - by default winston disables timestamps on the console
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { prettyPrint: true, 'timestamp':true });
logger.add(logger.transports.File, {
  filename : "logs/desdemona.log",
  prettyPrint: true,
  maxFiles : 4,
  maxFileSize : 100000,
  json : false
});

var config = require('./config');
config.pkg = require("./package.json");

var  destiny = require('./destiny');
// setup the config so everyone can get the destiny client
config.destiny.client = destiny;

var bot = require('./bot');

// start the bot
bot.login()
.then(function () {
  logger.info("bot started");
})
.catch(function(err) {
    // thrown error propagates here automatically
    // because it was not caught.
    if (err)
        logger.error("Failed to login to discord", err);
});






