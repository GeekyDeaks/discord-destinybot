'use strict';

var co = require('co');
var psn = require('../psn');
var md = require('../markdown');
var moment = require('moment-timezone');

function exec(cmd) {

    var msg = cmd.msg;
    var bot = cmd.bot;
    var name = cmd.args[0];
    var now = moment();

    // mentions take precedent
    if (msg.mentions.length > 0) {
        name = msg.mentions[0].username;
    } 

    if (!name) {
        return bot.sendMessage(msg, "did you forget something?");
    }

    var gamer = psn.lookup(name);
    if(!gamer) {
        return bot.sendMessage(msg, "Sorry, could not find **"+md.escape(name)+"**");
    }

    var localtime;
    // figure out the Localtime
    if (gamer.tz && moment.tz.zone(gamer.tz)) {
        localtime = "Localtime: **" + now.tz(gamer.tz).format("HH:mm (Z z)") + "**";
    } else {
        localtime = "TZ: **" + gamer.tz + "**";
    }

    return bot.sendMessage(msg, "@" + md.escape(gamer.discord) + " | PSN: **" +
        md.escape(gamer.psn) + "** | " + localtime);

}

module.exports = {
    desc: 'Lookup PSN name for a discord account',
    name: 'psn',
    usage: 'psn <@discord-id>',
    alias: [],
    exec: exec
};
