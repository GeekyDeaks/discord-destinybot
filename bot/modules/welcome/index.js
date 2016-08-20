'use strict';

var logger = require('winston');

var app = require.main.exports;
var bot = app.bot;

function init(bot) {
    logger.debug("init welcome module");
    return Promise.resolve();
}

/*
bot.on("serverNewMember", function(server, user) {
    logger.info("New User: %s", user.name);

    if(!config.welcome.enabled) return;


    if(config.welcome.auto) {
        var role = server.roles.get("name", config.welcome.auto);
        if(role) {
            logger.verbose("adding user: %s to role: %s", user.name, role.name);
            user.addTo(role);
        } else {
            logger.error("AutoUpgrade role %s does not appear to exist!", config.welcome.auto);
        }

    }

    var channel = server.channels.get("name", config.welcome.channel);
    if(!channel) {
        return logger.error("unable to welcome %s: channel %s not found", user.name, config.welcome.channel);
    }
    bot.sendMessage(channel, config.welcome.msg.replace(/:USER:/g, "<@"+user.id+">"));
});

bot.on("serverMemberRemoved", function(server, user) {
    logger.info("User: %s has left", user.name);
});

function isAdmin(msg) {

    var roles = msg.channel.server.roles;

    for (var r = 0; r < roles.length; r++) {
        if (roles[r].name !== config.discord.adminRole) continue;
        // found the admin role
        return msg.author.hasRole(roles[r]);
    }
    return false;
}

/* */

module.exports.init = init;