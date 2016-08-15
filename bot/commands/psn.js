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
    var joinedAt = 'Unknown';

    // mentions take precedent
    if (msg.mentions.length > 0) {
        name = msg.mentions[0].username;
    } else {
        name = cmd.msg.author.username;
    }

    if (!name) {
        // should not get here..
        return bot.sendMessage(msg, "did you forget something?");
    }

    var gamer = psn.lookup(name);
    if(!gamer) {
        return bot.sendMessage(msg, "Sorry, could not find **"+md.escape(name)+"**");
    }

    var localtime;
    // figure out the Localtime
    if (gamer.tz && moment.tz.zone(gamer.tz)) {
        localtime = " Localtime: " + now.tz(gamer.tz).format("HH:mm (Z z)");
    } else {
        localtime = "  Timezone: " + gamer.tz;
    }

    // get joined at timestamp
    var user = bot.users.get("username", gamer.discord);
    if(user) {
        var detailsOf = msg.channel.server.detailsOfUser(user);
        joinedAt = new Date(detailsOf.joinedAt).toUTCString();
    }

    return bot.sendMessage(msg, "```ruby\n"+
        "Discord ID: @" + gamer.discord + "\n"+
        "       PSN: " + gamer.psn + "\n"+
        "     Games: " +  gamer.games.join(", ") + "\n" +
        " Joined At: " + joinedAt + "\n" +
        localtime + "```");

}

module.exports = {
    desc: 'Lookup PSN name for a discord account',
    name: 'psn',
    usage: '`psn <@discord-id>`',
    alias: [],
    exec: exec
};
