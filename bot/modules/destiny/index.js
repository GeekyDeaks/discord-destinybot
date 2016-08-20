'use strict';

var logger = require('winston');
var app = require.main.exports;
var commands = app.commands;

function init() {
    logger.debug("init destiny module");


    // load the commands
    try {
         commands.load(__dirname);
    } catch (err) {
        logger.error("failed whilst loading destiny commands: ", err);
    }
    return Promise.resolve();

}

module.exports.init = init;