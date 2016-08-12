'use strict';
var co = require('co');

function exec(cmd) {

    return co(function* () {
        var bot = cmd.bot;
        var msg = cmd.msg;
        var args = cmd.args;
        var config = cmd.config;

        if(args.length === 0) {
            return bot.sendMessage(msg, 
                "```ruby\n"+
                "Channel: "+config.welcome.channel+"\n"+
                "Enabled: "+config.welcome.enabled+"\n"+
                "Message:\n"+config.welcome.msg+"```"
            );
        }

        switch (args.shift().toLowerCase()) {
            case 'enable':
                config.welcome.enabled = true;
                yield config.storage.setItem('welcome', config.welcome);
                return bot.sendMessage(msg, "welcome message enabled");
            case 'disable':
                config.welcome.enabled = false;
                yield config.storage.setItem('welcome', config.welcome);
                return bot.sendMessage(msg, "welcome message disabled");
            case 'channel':

                if (args.length === 0) {
                    return bot.sendMessage(msg, "no channel specified");
                }
                var channel = args[0];

                // check if the channel exists
                if (!msg.channel.server.channels.get("name", channel)) {
                    return bot.sendMessage(msg, "channel `" + channel + "` not found on the server");
                }

                // update the channel
                config.welcome.channel = channel;

                // save the settings
                yield config.storage.setItem('welcome', config.welcome);
                return bot.sendMessage(msg, "changed welcome channel to `"+channel+"`");
            case 'msg':
                if (args.length === 0) {
                    // send a list of roles:
                    return bot.sendMessage(msg, "no msg specified");
                }

                // return the message back to original
                config.welcome.msg = args.join(" ");
                yield config.storage.setItem('welcome', config.welcome);
                return bot.sendMessage(msg, "changed welcome message to:\n```\n"+config.welcome.msg+"```");

        }

    });

}

module.exports = {
    desc: 'Administor welcome message',
    name: 'welcome',
    usage: `
\t\t\`welcome\` - lists the current welcome message and settings
\t\t\`welcome enable\` - enables the welcome message
\t\t\`welcome disable\` - disables the welcome message
\t\t\`welcome channel\` - sets the channel the welcome message will be sent to
\t\t\`welcome msg\` - sets the msg to send

\t\tuse \`:USER:\` in the msg to mention the new recruit`,
    alias: [],
    exec: exec,
    admin: true
};