'use strict';

var co = require('co');
//var psn = require('../psn');
var md = require('../../../markdown');
var parse = require('../parse');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;

function exec(cmd) {

   return co(function* () {
        var msg = cmd.msg;
        var name = cmd.args[0];

        var server = msg.server || app.defaultServer;

        if(!name) {
            return message.send(msg, "role missing", cmd.isPublic, 10000);
        }
        // figure out the role
        var role = server.roles.get("name", name);

        if(!role) {
            return message.send(msg, "unable to find role: "+name, cmd.isPublic, 10000 );
        }

        var now = Date.now();

        var users = {};
        server.members.forEach(function (u) {
            if(u.hasRole(role)) {
                var ja = server.detailsOfUser(u).joinedAt;
                users[u] = {
                    joinedAt : ja,
                    tenure : Math.round( (now - ja) / 86400000)
                }
            }
        });

        var toSend = [];
        Object.keys(users).sort(function(a, b) {
            return users[a].joinedAt - users[b].joinedAt;
        }).forEach(function (u) {
            toSend.push(u + " | " + new Date(users[u].joinedAt).toISOString() + " | " + users[u].tenure)
        });

        message.send(msg, toSend, cmd.isPublic);

   });
}

module.exports = {
    desc: 'Display the joined date of role members',
    name: 'joined',
    usage: '`joined <role>`',
    alias: [],
    exec: exec,
    admin: true
};