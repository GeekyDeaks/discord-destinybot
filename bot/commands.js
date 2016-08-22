'use strict';

var logger = require('winston');
var fs = require('fs');
var path = require('path');
var co = require('co');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;

var commands = {};

function load(d) {

    var dir = path.join(d, 'commands');
    // load up the commands
    fs
        .readdirSync(dir)
        .filter(function (file) {
            // only load up named commands
            return (file.indexOf('.') !== 0) && (file !== 'index.js');
        })
        .forEach(function (file) {
            var filePath = path.join(dir, file);
            logger.debug('checking command file: %s', filePath);
            var cmd = require(filePath);
            if (!cmd) {
                return logger.error('failed to load command file: %s', filePath)
            }

            if (cmd.disabled) return;

            if (cmd.name) {
                // maybe we should check if the command already exists?
                logger.verbose('loading command %s', cmd.name);
                commands[cmd.name] = cmd;
            }
            // sort out the aliases
            if (cmd.alias) {
                cmd.alias.forEach(function (alias) {
                    logger.debug("adding alias '%s' for command '%s'", alias, cmd.name);
                    commands[alias] = cmd;
                })
            }
        }); 

    
}

// add the help command

function help(cmd) {
    return co(function* () {

        var msg = cmd.msg;
        var args = cmd.args;

        if(args.length > 0) {
            var c = args[0];
            if(!commands[c]) {
                return bot.sendMessage(msg, "command `"+c+"` not recognised");
            }
            if(commands[c].usage) {
                return bot.sendMessage(msg, "\tusage: " + commands[c].usage);
            } else {
                return bot.sendMessage(msg, "no usage defined for command `"+c+"`");
            }
        }

        var toSend = [];
        Object.keys(commands).forEach(function (name) {
            if (name === commands[name].name) {
                toSend.push("**" + name + "** - " + commands[name].desc);
                if (commands[name].alias.length > 0) {
                    toSend.push("\t_aliases: " + commands[name].alias.join(" | ") + "_");
                }
                if(commands[name].usage) {
                    toSend.push("\tusage: " + 
                        // if we have an array, then just join everything with \n
                        (Array.isArray(commands[name].usage) ? commands[name].usage.join("\n") : commands[name].usage)
                    );
                }
            }
        });

        return bot.sendMessage(msg, toSend.join("\n"));

    });
}

commands.help = {
    desc: 'List commands',
    name: 'help',
    usage: 'help [command]',
    alias: ['h'],
    exec: help
};

bot.on("messageUpdated", function (msg0, msg1) {
    parseMessage(msg1);
});

bot.on("message", parseMessage);

function parseMessage(msg) {
    
    co(function* () {

        if (msg.author.id === bot.user.id) return;
        if (msg.author.bot) return;

        // look for the command prefix
        if(!msg.content.toLowerCase().startsWith(config.commandPrefix)) return;

        logger.debug("got message from [%s] in channel [%s]: ", 
            msg.author.username, (msg.channel.name || "PM"), msg.content);

        //strip off the prefix and split into args
        var args = msg.content.substring(config.commandPrefix.length).trim().match(/[^\s]+|"(?:\\"|[^"])+"/g);
        var cmdName = args.shift().toLowerCase();

        logger.debug("found command '%s'", cmdName);

        // yep, ok then see if we have that command loaded
        if(!commands[cmdName] || !commands[cmdName].exec) return;

        // check if it's an admin command
        if(commands[cmdName].admin && !isAdmin(msg)) {
            // see if we have the admin role
            return bot.sendMessage(msg, "Not authorised");
        }

        var cmd = {
            msg: msg,
            args: args,
            name: cmdName
        };

        logger.debug("executing command [%s] with args [%s]", cmdName, args.join(","));
        // all looks good, so let's run the command
        yield commands[cmdName].exec(cmd);

    }).catch(function (err) {
        logger.error("Error when parsing msg '"+msg+"':"+err);
        bot.sendMessage(msg, "Oops, something went unexpectedly wrong\n```"+err+"```");
    });


}

function isAdmin(msg) {
    var server = msg.server || app.defaultServer;
    var role = server.roles.get("name", config.discord.adminRole);
    if(!role) return false;

    return msg.author.hasRole(role);
}

module.exports.load = load;