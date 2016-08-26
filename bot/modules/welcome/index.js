'use strict';

var logger = require('winston');
var co = require('co');

var app = require.main.exports;
var bot = app.bot;
var commands = app.commands;
var db = app.db;

function init(bot) {
    logger.debug("init welcome module");

    // load the commands
    try {
         commands.load(__dirname);
    } catch (err) {
        logger.error("failed whilst loading welcome commands: ", err);
    }

    return Promise.resolve();
}

bot.on("serverNewMember", function(server, user) {

    return co(function* () {

        logger.info("New User: %s", user.name);

        var welcome = yield db.collection('settings').findOne({ "name": "welcome" });

        // no settings or disabled
        if (!welcome || !welcome.enabled) return;

        if (welcome.auto) {
            var role = server.roles.get("name", welcome.auto);
            if (role) {
                logger.verbose("adding user: %s to role: %s", user.name, role.name);
                user.addTo(role);
            } else {
                logger.error("AutoUpgrade role %s does not appear to exist!", welcome.auto);
            }

        }

        var channel = server.channels.get("name", welcome.channel);
        if (!channel) {
            return logger.error("unable to welcome %s: channel %s not found", user.name, welcome.channel);
        }
        bot.sendMessage(channel, welcome.msg.replace(/:USER:/g, "<@" + user.id + ">"));

    });
});

bot.on("serverMemberRemoved", function(server, user) {

    return co(function* () {

        logger.info("User: %s has left", user.name);
        var welcome = yield db.collection('settings').findOne({ "name": "welcome" });

        // no settings or disabled
        if (!welcome || !welcome.enabled) return;

        var channel = server.channels.get("name", welcome.channel);
        if (!channel) {
            return logger.error("unable to say goodbye to %s: channel %s not found", user.name, welcome.channel);
        }
        bot.sendMessage(channel, user.name + " has left - bye bye!");

    });
});

module.exports.init = init;