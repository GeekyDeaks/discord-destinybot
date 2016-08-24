'use strict';

var co = require('co');
//var psn = require('../psn');
var md = require('../../../markdown');
var parse = require('../parse');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

function exec(cmd) {

   return co(function* () {
        var msg = cmd.msg;

        var server = msg.server || app.defaultServer;

        var busyMsg = yield message.send(msg, ":stopwatch: Parsing #" + config.modules.voc.psnChannel, cmd.isPublic);

        // get the channel details
        var channel = server.channels.get("name", config.modules.voc.psnChannel);

        if(!channel) {
            return message.update(busyMsg, "cannot find channel #"+config.modules.voc.psnChannel, 10000);
        }

        yield parse.scrape(channel);

        // scan through the list of Users
        var missing = [];
        var gamer;
        var members = server.members;
        for(var m = 0; m < members.length ; m++) {
            if(members[m].bot) continue;
            gamer = yield db.collection(config.modules.gamer.collection).findOne( 
                { discord : members[m].username } );

            if(!gamer) {
                missing.push(members[m].username);
            } 
        }

        var toSend = [];

        toSend.push("Parsed #"+ config.modules.voc.psnChannel);
        toSend.push("Users: **"+ bot.users.length +
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
        //yield message.send(msg, toSend, cmd.isPublic);

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