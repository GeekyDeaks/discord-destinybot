'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var md = require('../../../markdown');
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

        if(args.length === 0) {
            // send a list of roles:

            var toSend = ["The currently available channels are:"];

            var rc = db.collection(config.modules.role.collection).find().sort("alias");
            while(yield rc.hasNext()) {
                role = yield rc.next();
                toSend.push("● `"+ role.alias + "`" +
                        (role.desc ? " | " + role.desc : "") );
            }

            return message.send(msg, toSend, cmd.isPublic);
        }

        var alias = args[0];
        // check if the role exists

        var regex = { $regex: '^'+alias+'$', $options : 'i' };

        var role = yield db.collection(config.modules.role.collection).findOne({ alias : regex});
        if(!role) {
            return message.send(msg, "role `" + alias + "` not found", cmd.isPublic, 10000 );
        }

        // 
        var serverRole = server.roles.get("name", role.name);
        if(!serverRole) {
            return message.send(msg, "oops, something is not right.  Could not find role `"+role.name+"`", cmd.isPublic, 10000 );
        }

        if (msg.author.hasRole(serverRole)) {
            yield msg.author.removeFrom(serverRole);
            return message.send(msg, "you are not `" + role.alias + "`", cmd.isPublic);
        } else {
            yield msg.author.addTo(serverRole);
            return message.send(msg, "you are now `" + role.alias + "`", cmd.isPublic);
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