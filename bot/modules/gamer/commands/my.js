'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var md = require('../../../markdown');
var moment = require('moment-timezone');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

function exec(cmd) {

    return co(function* (){

        var msg = cmd.msg;
        var args = cmd.args;

        var option = args.shift();

        switch(option.toLowerCase()) {
            case 'xbl':
                if(!args.length) return message.send(msg, "missing xbl gamertag", cmd.pm, 10000);
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { xbl: args[0], "discord.name" : msg.author.name, modified: true } },
                    { upsert: true }
                );
                return message.send(msg, "Updated XBL Tag to: "+args[0]);

            case 'psn':
                if(!args.length) return message.send(msg, "missing psn id", cmd.pm, 10000);
                yield db.collection(config.modules.gamer.collection).updateOne(
                    { "discord.id": msg.author.id },
                    { $set: { psn: args[0], "discord.name" : msg.author.name, modified: true } },
                    { upsert: true }
                );
                return message.send(msg, "Updated PSN Tag to: "+args[0]);

            case 'game':
                if(!args.length) return message.send(msg, "no games specified", cmd.pm, 10000);
                break;
            case 'tz':
                if(!args.length) return message.send(msg, "missing tz", cmd.pm, 10000);
                break;
            default:
                return message.send(msg, "sorry, don't understand `"+option+"`", cmd.pm, 10000);

        }
        
    });

}

module.exports = {
    desc: 'Set/Edit your gamer info',
    name: 'my',
    usage: ["",  // this causes a CR
            "\t\t`xbl <xbl gamertag>` - set your xbl gamertag",
            "\t\t`psn <psn id>` - set your psn id",
            "\t\t`tz <timezone>` - set your timezone",
            "\t\t`game [+game]|[-game]` - add or remove a game"],
    alias: [],
    exec: exec,
    admin: true
};