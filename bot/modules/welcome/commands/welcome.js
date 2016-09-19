'use strict';
var co = require('co');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;


function exec(cmd) {

    return co(function* () {

        var msg = cmd.msg;
        var args = cmd.args;
        var server = msg.server || app.defaultServer;
        var welcome = { name : 'welcome', enabled : false };

        if(args.length === 0) {

            welcome = yield db.collection('settings').findOne({ "name" : "welcome" });
            if(!welcome) {
                return message.send(msg, "No welcome settings defined", cmd.pm);
            }

            return message.send(msg, 
                "```" + cmd.format +"\n"+
                "     Channel: "+welcome.channel+"\n"+
                "Auto-Upgrade: "+welcome.auto+"\n"+
                "     Enabled: "+welcome.enabled+"\n"+
                "     Message:\n"+welcome.msg+"```", 
                cmd.pm
            );
        }

        switch (args.shift().toLowerCase()) {
            case 'enable':
                welcome.enabled = true;
                yield db.collection('settings').updateOne( { "name" : "welcome" }, { $set: welcome }, { upsert : true});
                return message.send(msg, "welcome message enabled", cmd.pm);
            case 'disable':
                welcome.enabled = false;
                yield db.collection('settings').updateOne( { "name" : "welcome" }, { $set: welcome }, { upsert : true});
                return message.send(msg, "welcome message disabled", cmd.pm);
            case 'channel':

                if (args.length === 0) {
                    return message.send(msg, "no channel specified", cmd.pm, 10000);
                }
                var channel = args[0];

                // check if the channel exists
                if (!server.channels.get("name", channel)) {
                    return message.send(msg, "channel `" + channel + "` not found on the server", cmd.pm, 10000);
                }

                // update the channel
                welcome.channel = channel;

                // save the settings
                yield db.collection('settings').updateOne( { "name" : "welcome" }, { $set: welcome }, { upsert : true});
                return message.send(msg, "changed welcome channel to `"+channel+"`", cmd.pm);
            case 'msg':
                if (args.length === 0) {
                    // send a list of roles:
                    return message.send(msg, "no msg specified", cmd.pm, 10000);
                }

                // return the message back to original
                welcome.msg = args.join(" ");
                yield db.collection('settings').updateOne( { "name" : "welcome" }, { $set: welcome }, { upsert : true});
                return message.send(msg, "changed welcome message to:\n```\n"+welcome.msg+"```", cmd.pm);
            case 'auto-upgrade':
                if (args.length === 0) {
                    // send a list of roles:
                    return message.send(msg, "no role specified", cmd.pm, 10000);
                }

                var role = args[0];

                if (!server.roles.get("name", role)) {
                    return message.send(msg, "role `" + role + "` not found on server `"+ server.name +"`", cmd.pm, 10000);
                }

                welcome.auto = role;
                yield db.collection('settings').updateOne( { "name" : "welcome" }, { $set: welcome }, { upsert : true});
                return message.send(msg, "changed auto-upgrade role to: `"+role+"`", cmd.pm);
        }

    });

}

module.exports = {
    desc: 'Administor welcome message',
    name: 'welcome',
    usage: ["",
            "\t\t`welcome` - lists the current welcome message and settings",
            "\t\t`welcome enable` - enables the welcome message",
            "\t\t`welcome disable` - disables the welcome message",
            "\t\t`welcome channel` - sets the channel the welcome message will be sent to",
            "\t\t`welcome msg` - sets the msg to send",
            "\t\t`welcome auto-upgrade` - sets the role to automatically upgrade new users to",
            "\t\tuse `:USER:` in the msg to mention the new recruit"],
    alias: [],
    exec: exec,
    admin: true
};