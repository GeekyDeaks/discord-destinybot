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

        var role;

        if(args.length === 0) {
            // send a list of SARs
            var toSend = ["Current SARs:\n"];

            var rc = db.collection(config.modules.role.collection).find().sort("alias");
            while(yield rc.hasNext()) {
                role = yield rc.next();
                toSend.push("```ruby\n" +
                    "Alias: " + role.alias + "\n" +
                    " Role: " + role.name + "\n" +
                    " Desc: " + (role.desc || "") + "```"
                );
            }

            return bot.sendMessage(msg, toSend.join("\n"));
        }

        switch (args.shift().toLowerCase()) {
            case 'add':
                args = args.join(" ").split(";");

                if (args.length < 2) {
                    return bot.sendMessage(msg, "syntax: add role;alias[;description]");
                }

                role = {
                    name : args[0],
                    alias : args[1],
                    desc : args[2]
                }

                // check if the role exists
                if (!msg.channel.server.roles.get("name", role.name)) {
                    return bot.sendMessage(msg, "role `" + role.name + "` not found on the server");
                }

                // add the role alias
                yield db.collection(config.modules.role.collection).updateOne(
                    { name: role.name },{ $set: role },
                    { upsert: true }
                );

                return bot.sendMessage(msg, "SAR `" + role.alias + "` for role `" + role.name + "` added");
            case 'del':
                if (args.length === 0) {
                    // send a list of roles:
                    return bot.sendMessage(msg, "No alias specified");
                }

                var alias = args[0];

                if(yield db.collection(config.modules.role.collection.deleteOne({ alias : alias }))) {
                    return bot.sendMessage(msg, "SAR `" + alias + "` deleted");
                } else {
                    return bot.sendMessage(msg, "Cannot find alias `" + alias + "`");
                }
        }

    });

}

module.exports = {
    desc: 'Administor SAR',
    name: 'sar',
    usage: ["",  // this causes a CR
            "\t\t`sar` - lists the currently defined SARs",
            "\t\t`sar add <role>;<alias>[;<description>]` - update/add alias to a role",
            "\t\t`sar del <alias>` - delete SAR"],
    alias: [],
    exec: exec,
    admin: true
};