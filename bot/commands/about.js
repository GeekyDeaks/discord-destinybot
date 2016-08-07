'use strict';

var co = require('co');
var util = require('util');

function* exec(cmd) {

    return co(function* () {
        var toSend = [];
        toSend.push(util.format("* **Author** %s", cmd.config.pkg.author));
        toSend.push("* **Library** [https://github.com/hydrabolt/discord.js/]");
        toSend.push(util.format("* **Version** %s", cmd.config.pkg.version));
        toSend.push(util.format("* **Home Page** [%s]", cmd.config.pkg.homepage));
        return cmd.bot.sendMessage(cmd.msg, toSend.join("\n"));
    });

}

module.exports = {
    desc: 'It\'s all me, me, me...',
    name: 'about',
    usage: '',
    alias: ['a'],
    exec: exec
};