'use strict';
var co = require('co');

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var args = cmd.args;
        var config = cmd.config;

        if(args.length === 0) {
            // send a list of SARs
            var toSend = ["Current SARs:\n"];

            Object.keys(config.roles).forEach( function(r) {
                toSend.push("```" +
                    "Alias: " + r + "\n" +
                    " Role: " + config.roles[r].name + "\n" +
                    " Desc: " + (config.roles[r].desc || "") + "```"
                );

            });

            return bot.sendMessage(msg, toSend.join("\n"));
        }

        switch (args.shift().toLowerCase()) {
            case 'add':
                args = args.join(" ").split(";");

                if (args.length < 2) {
                    return bot.sendMessage(msg, "syntax: add role;alias[;description]");
                }
                var role = args[0];
                var alias = args[1];
                var desc = args[2];

                // check if the role exists
                if (!msg.channel.server.roles.map(role => role.name).includes(role)) {
                    return bot.sendMessage(msg, "role `" + role + "` not found on the server");
                }

                // add the role alias
                config.roles[alias] = {
                    name: role,
                    desc: desc
                }

                // save the settings
                yield config.storage.setItem('roles', config.roles);
                return bot.sendMessage(msg, "SAR `" + alias + "` for role `" + role + "` added");
            case 'del':
                if (args.length === 0) {
                    // send a list of roles:
                    return bot.sendMessage(msg, "No alias specified");
                }

                var alias = args[0];

                if (!config.roles[alias]) {
                    return bot.sendMessage(msg, "Cannot find alias `" + alias + "`");
                }

                delete config.roles[alias];

                // save the settings
                yield config.storage.setItem('roles', config.roles);
                return bot.sendMessage(msg, "SAR `" + alias + "` deleted");
        }

    });

}

module.exports = {
    desc: 'Administor SAR',
    name: 'sar',
    usage: undefined,
    alias: [],
    exec: exec,
    admin: true
};