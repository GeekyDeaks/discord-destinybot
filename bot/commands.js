'use strict';

var logger = require('winston');
var fs = require('fs');
var path = require('path');
var co = require('co');
var message = require('./message');
var levenshtein = require('fast-levenshtein');

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
                return message.send(msg, "command `"+c+"` not recognised", cmd.pm, 10000);
            }

            return message.send(msg, commandHelp(c).join("\n"), cmd.pm);
        }

        var toSend = [];
        Object.keys(commands).sort().forEach(function (name) {

            if(name !== commands[name].name) return; // skip aliases
            if(commands[name].admin && !isAdmin(msg)) return; // skip admin commands for non-admin

            toSend.push(commandHelp(name).join("\n"));

        });

        return message.send(msg, toSend, cmd.pm);

    });
}

function commandHelp(name) {
    var toSend = [];
    toSend.push("**" + name + "** - " + commands[name].desc);
    if (commands[name].alias.length > 0) {
        toSend.push("\t_aliases: " + commands[name].alias.join(" | ") + "_");
    }
    if (commands[name].usage) {
        toSend.push("\tusage: " +
            // if we have an array, then just join everything with \n
            (Array.isArray(commands[name].usage) ? commands[name].usage.join("\n") : commands[name].usage)
        );
    }
    return toSend;
}

commands.help = {
    desc: 'List commands',
    name: 'help',
    usage: '`help [command]`',
    alias: ['h'],
    exec: help
};

function closestCommand(cmd) {
    var distance = Object.keys(commands).filter(function (cname) {
        return(commands[cname].name === cname);
    }).map(function (cname) {
        return [cname, levenshtein.get(cmd.toLowerCase(), cname.toLowerCase())];
    });

    distance.sort(function (a,b) {
        return a[1] - b[1];
    });

    return distance[0][0];

}

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

        var cmd = {
            msg: msg,
            pm : (config.discord.pm || false)
        };

        logger.debug("got message from [%s] in channel [%s]: ", 
            msg.author.username, (msg.channel.name || "PM"), msg.content);

        //strip off the prefix and split into args
        var args = msg.content.substring(config.commandPrefix.length).trim().match(/[^\s]+|"(?:\\"|[^"])+"/g);

        // check if the last argument/command was or ends with a format request
        var match = args[args.length - 1].match(/^(.*)\!([^\!]*)$/);
        if(match) {
            cmd.format = match[2];
            // if there was anything prior to the !, save it
            if(match[1]) {
                args[args.length - 1] = match[1];
            } else {
                args.length--;
            }
        } else {
            cmd.format = 'ruby';
        }

        cmd.args = args;
        var cmdName = cmd.cmdName = args.shift().toLowerCase();

        // check if the last argument was public
        if(args.length && (args[args.length - 1].toLowerCase() === 'public')) {
            cmd.pm = msg.channel.isPrivate;
            args.length--;
        }

        // yep, ok then see if we have that command loaded
        if(!commands[cmdName] || !commands[cmdName].exec) {
            return message.send(msg, "Sorry " + msg.author.mention() + ", I am not sure what to do with `"+
            cmdName + "`.  Did you mean `"+closestCommand(cmdName)+"`?", cmd.pm, 10000);
        }

        logger.debug("found command '%s'", cmdName);

        // check if it's an admin command
        if(commands[cmdName].admin && !isAdmin(msg)) {
            // see if we have the admin role
            return message.send(msg, "You are not authorised to run `"+cmdName+"`", cmd.pm, 10000);
        }

        logger.debug("executing command [%s] with args [%s]", cmdName, args.join(","));
        // all looks good, so let's run the command
        yield commands[cmdName].exec(cmd);

    }).catch(function (err) {
        logger.error("Error when parsing msg '"+msg+"':"+err);
        message.send(msg, 
           ["Oops, something went unexpectedly wrong and I saw this error:", 
            "```"+err+"```", 
           "Please check to see if the command worked as it can sometimes be a problem with discord.",
           "Otherwise, please try the command again" ], msg.channel.isPrivate, 10000);
    });


}

function isAdmin(msg) {
    var server = msg.server || app.defaultServer;
    var role = server.roles.get("name", config.discord.adminRole);
    if(!role) return false;

    return msg.author.hasRole(role);
}

module.exports.load = load;