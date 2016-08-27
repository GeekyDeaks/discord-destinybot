'use strict'

var co = require('co');
var util = require('util');
var logger = require('winston');
var mongoClient = require('mongodb').MongoClient;

var app = require.main.exports;
var commands = app.commands;
var config = app.config;

function init() {

    logger.debug("init db module");

    return co(function* () {
        app.db = yield mongoClient.connect(config.modules.db.url, { poolSize : 1 });
        logger.debug("connected to %s",config.modules.db.url);

    });
   

}

module.exports.init = init;