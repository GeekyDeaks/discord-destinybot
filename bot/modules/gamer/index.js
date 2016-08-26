'use strict';

var logger = require('winston');
var co = require('co');
var app = require.main.exports;
var commands = app.commands;
var db = app.db;
var config = app.config;

function init(bot) {
    logger.debug("init gamers module");

    // load the commands
    try {
         commands.load(__dirname);
    } catch (err) {
        logger.error("failed whilst loading gamers commands: ", err);
    }

    return Promise.resolve();
}

function findById(id) {
    return db.collection(config.modules.gamer.collection).findOne({ "discord.id" : id });
}

function findOneByName(name) {

    var regex = { $regex: '^'+name+'$', $options : 'i' };
    return db.collection(config.modules.gamer.collection).findOne({ "discord.name" : regex });

}

function findByName(name) {

    var regex = { $regex: '^'+name+'$', $options : 'i' };
    return db.collection(config.modules.gamer.collection).find({ "discord.name" : regex });

}

function findNearestByName(name) {

}

//
// general purpose lookup - tries to resolve a name/id
// in the order they are provided in the arguments
// not used at present as we generally want to report the 
// name we tried if the lookup fails
function lookup() {
    var args = arguments;
    return co(function* () {
        for (var a = 0; a < args.length; a++) {

            var lookup = args[a];
            if (!lookup) continue;

            // does it have an @ sign at the start?
            lookup.replace(/^@/, "");

            // does it look like an ID?

            if (lookup.match(/^\d+$/)) {
                return findById(lookup);
            } else {
                // try and lookup the name
                return findByName(lookup);
            }
        }
    });

}

module.exports.findById = findById;
//module.exports.findByName = findByName;
module.exports.findOneByName = findOneByName;
module.exports.init = init;