'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var md = require('../../../markdown');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

function exec(cmd) {

    return co(function* () {

        var msg = cmd.msg;
        var args = cmd.args;

        if(args.length === 0) {
            // send a list of roles:

            var toSend = ["The currently available channels are:"];

            var rc = db.collection(config.modules.role.collection).find().sort("alias");
            while(yield rc.hasNext()) {
                role = yield rc.next();
                toSend.push("● `"+ role.alias + "`" +
                        (role.desc ? " | " + role.desc : "") );
            }

            return bot.sendMessage(msg, toSend.join("\n"));
        }

        var alias = args[0];
        // check if the role exists

        var role = yield db.collection(config.modules.role.collection).findOne({ alias : alias});
        if(!role) {
            return bot.sendMessage(msg, "role `" + alias + "` not found");
        }

        // 
        var serverRole = msg.channel.server.roles.get("name", role.name);
        if(!serverRole) {
            return bot.sendMessage(msg, "oops, something is not right.  Could not find role `"+role.name+"`");
        }

        if (msg.author.hasRole(serverRole)) {
            yield msg.author.removeFrom(serverRole);
            return bot.sendMessage(msg, "you are not `" + role.alias + "`");
        } else {
            yield msg.author.addTo(serverRole);
            return bot.sendMessage(msg, "you are now `" + role.alias + "`");
        }

    });

}

module.exports = {
    desc: 'Set / Unset role',
    name: 'role',
    usage: '`role <role>`',
    alias: ['r'],
    exec: exec
};