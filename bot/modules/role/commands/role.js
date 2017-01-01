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

        var server = msg.guild || app.defaultServer;

        if(args.length === 0) {
            // send a list of roles:

            var toSend = ["The currently available channels are:"];

            var rc = db.collection(config.modules.role.collection).find().sort("alias");
            while(yield rc.hasNext()) {
                role = yield rc.next();
                toSend.push("● `"+ role.alias + "`" +
                        (role.desc ? " | " + role.desc : "") );
            }

            return message.send(msg, toSend, cmd.pm);
        }

        var alias = args[0];
        // check if the role exists

        var regex = { $regex: '^'+alias+'$', $options : 'i' };

        var role = yield db.collection(config.modules.role.collection).findOne({ alias : regex});
        if(!role) {
            return message.send(msg, "Sorry "+msg.author+", I could not find the role `" + alias + "`", cmd.pm, 10000 );
        }

        // make sure the user is not cached
        var user = yield bot.fetchUser(msg.author.id);
        if (!user) {
            return message.send(msg, "Sorry "+msg.author+", I could not find you on discord", cmd.pm, 10000 );
        }

        // 
        var member = server.member(user);
        if(!member) {
            return message.send(msg, "Sorry "+msg.author+", I could not find you on the server", cmd.pm, 10000);
        }

        var serverRole = server.roles.find("name", role.name);

        if(!serverRole) {
            return message.send(msg, "Sorry "+msg.author+", I could not find role `"+role.name+"`", cmd.pm, 10000 );
        }

        var roles = member.roles;

        if (roles.has(serverRole.id)) {
            roles.delete(serverRole.id);
            yield member.setRoles(roles);
            return message.send(msg, msg.author+", you are no longer subscribed to `" + role.alias + "`", cmd.pm);
        } else {
            roles.set(serverRole.id, serverRole);
            yield member.setRoles(roles);
            return message.send(msg, msg.author+", you are now subscribed to `" + role.alias + "`", cmd.pm);
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