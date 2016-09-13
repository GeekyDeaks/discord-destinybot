'use strict';

var co = require('co');
//var psn = require('../psn');
var md = require('../../../markdown');
var parse = require('../parse');
var message = require('../../../message');
var gamer = require('../../gamer');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

function exec(cmd) {

   return co(function* () {
        var msg = cmd.msg;

        var server = msg.guild || app.defaultServer;

        var busyMsg = yield message.send(msg, ":stopwatch: Parsing #" + config.modules.voc.psnChannel, cmd.pm);

        // get the channel details
        var channel = server.channels.find("name", config.modules.voc.psnChannel);

        if(!channel) {
            return message.update(busyMsg, "cannot find channel #"+config.modules.voc.psnChannel, 10000);
        }

        yield parse.scrape(channel);

        // scan through the list of Users
        var missing = [];
        var g;
        var members = server.members.array();
        var userCount = members.length;
        var m;
        while(m = members.shift()) {
            if(m.bot) continue;
            g = yield gamer.findById(m.id); 
            if(!g) {
                missing.push(m.user.username);
            } 
        }

        var toSend = [];

        toSend.push("Parsed #"+ config.modules.voc.psnChannel);
        toSend.push("Users: **"+ userCount +
                "** | Errors: **"+parse.errors.length+
                "** | Warnings: **"+parse.warnings.length+
                "** | Missing: **"+missing.length+"**");

        if(parse.errors.length) {
            toSend.push("---- **"+parse.errors.length+"** Parsing Error(s) ------------------");
            parse.errors.forEach(function (e) {
                toSend.push(md.escape(e));
            })
        }

        if(parse.warnings.length) {
            toSend.push("---- **"+parse.warnings.length+"** Parsing Warning(s) ------------------");
            parse.warnings.forEach(function (w) {
                toSend.push(md.escape(w));
            })
        }

        if (missing.length) {
            toSend.push("---- **" + missing.length + "** Missing discord tag(s) ------------------");
            missing.sort().forEach(function (u) {
                toSend.push(md.escape(u));
            })
        }

        yield message.update(busyMsg, toSend);
        //yield message.send(msg, toSend, cmd.pm);

    });

}

module.exports = {
    desc: 'Reload PSN database',
    name: 'reload',
    usage: undefined,
    alias: [],
    exec: exec,
    admin: true
};