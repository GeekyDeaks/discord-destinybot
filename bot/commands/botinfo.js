'use strict';

var co = require('co');

function exec(cmd) {

    return co(function* () {
        var msg = cmd.msg;
        var bot = cmd.bot;

        var toSend = [];
        toSend.push("**Info on** " + msg.channel.server.name.replace(/@/g, '@\u200b') + " (" +
            msg.channel.server.id + ") 🕵🏻");
        toSend.push("**Owner:** " + msg.channel.server.owner.username.replace(/@/g, '@\u200b') + " (**ID:** " +
            msg.channel.server.owner.id + ")");
        toSend.push("**Region:** " + msg.channel.server.region);
        toSend.push("**Members:** " + msg.channel.server.members.length + " **Channels:** " +
            msg.channel.server.channels.filter(c => c.type == "text").length + "T " +
            msg.channel.server.channels.filter(c => c.type == "voice").length + "V");
        toSend.push("**Server created on** " +
            new Date((msg.channel.server.id / 4194304) + 1420070400000).toUTCString());
        var roles = msg.channel.server.roles.map(role => role.name);
        roles = roles.join(", ").replace(/@/g, '@\u200b');
        if (roles.length <= 1500) toSend.push("**Roles:** `" + roles + "`");
        else toSend.push("**Roles:** `" + roles.split(", ").length + "`");
        toSend.push("**Default channel:** " + msg.channel.server.defaultChannel);
        toSend.push("**Icon URL:** `" + msg.channel.server.iconURL + "`");
        return bot.sendMessage(msg, toSend);
    });

}

module.exports = {
    desc: 'bot information',
    name: 'botinfo',
    usage: undefined,
    alias: ['i', 'info'],
    exec: exec
};
