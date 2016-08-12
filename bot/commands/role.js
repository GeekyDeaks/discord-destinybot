'use strict';
var co = require('co');

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var args = cmd.args;
        var config = cmd.config;

        if(args.length === 0) {
            // send a list of roles:
            return bot.sendMessage(msg, 
                "The currently available channels are:\n" + 
                Object.keys(config.roles).map(function (r) {
                    return(":black_small_square: `"+ r + "`" +
                        (config.roles[r].desc ? " " + config.roles[r].desc : ""));
                }).sort().join("\n"));
        }
        var role = args[0];
        // check if the role exists
        if(!config.roles[role]) {
            return bot.sendMessage(msg, "role `"+role+"` not found");
        }

        var roleName = config.roles[role].name;
        var roles = msg.channel.server.roles;

        for(var r = 0; r < roles.length; r++) {
            
            if(roles[r].name !== roleName) continue;

            if (msg.author.hasRole(roles[r])) {
                yield msg.author.removeFrom(roles[r]);
                return bot.sendMessage(msg, "you are not `" + role + "`");
            } else {
                yield msg.author.addTo(roles[r]);
                return bot.sendMessage(msg, "you are now `" + role + "`");
            }
        }
        return bot.sendMessage(msg, "oops, something is not right.  Could not find role `"+roleName+"`");

    });

}

module.exports = {
    desc: 'Set / Unset role',
    name: 'role',
    usage: '`role <role>`',
    alias: ['r', 'roles', 'channels'],
    exec: exec
};