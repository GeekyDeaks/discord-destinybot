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

bot.on("guildMemberAdd", function(server, member) {

    return co(function* () {

        logger.info("New User: %s", member.user.username);

        var welcome = yield db.collection('settings').findOne({ "name": "welcome" });

        // no settings or disabled
        if (!welcome || !welcome.enabled) return;

        if (welcome.auto) {
            var role = server.roles.find("name", welcome.auto);
            if (role) {
                logger.verbose("adding user: %s to role: %s", member.user.username, role.name);

                var roles = member.roles;
                roles.set(role.id, role);
                yield member.setRoles(roles);
            } else {
                logger.error("AutoUpgrade role %s does not appear to exist!", welcome.auto);
            }

        }

        var channel = server.channels.find("name", welcome.channel);
        if (!channel) {
            return logger.error("unable to welcome %s: channel %s not found", member.user.username, welcome.channel);
        }
        channel.sendMessage(welcome.msg.replace(/:USER:/g, "<@" + member.user.id + ">"));

    });
});

bot.on("guildMemberRemove", function(server, member) {

    return co(function* () {

        logger.info("User: %s has left", member.user.username);
        var welcome = yield db.collection('settings').findOne({ "name": "welcome" });

        // no settings or disabled
        if (!welcome || !welcome.enabled) return;

        var channel = server.channels.find("name", welcome.channel);
        if (!channel) {
            return logger.error("unable to say goodbye to %s: channel %s not found", member.user.username, welcome.channel);
        }
        channel.sendMessage(member.user.username + " has left - bye bye!");

    });
});

module.exports.init = init;