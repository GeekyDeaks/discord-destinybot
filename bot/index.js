'use strict';


var config = require('../config');
var logger = require('winston');
var fs = require('fs');
var path = require('path');
var co = require('co');
var psn = require('./psn');

var Discord = require("discord.js");
var bot = new Discord.Client({maxCachedMessages: 1000, forceFetchUsers: true});

var commands = {};
var commandPath = path.join(__dirname, 'commands');

// load up the commands
fs
  .readdirSync(commandPath)
  .filter(function(file) {
    return (file.indexOf('.') !== 0) && (file !== 'index.js');
  })  
  .forEach(function(file) {
      logger.debug('checking command file: %s', file);
      var cmd = require(path.join(commandPath, file));
      if(!cmd) {
          return logger.error('failed to load command file: %s', file)
      }

      if(cmd.disabled) return;
      
      if(cmd.name) {
          logger.verbose('loading command %s', cmd.name);
          commands[cmd.name] = cmd;
      }
      // sort out the aliases
      if(cmd.alias) {
          cmd.alias.forEach(function(alias) {
              logger.debug("adding alias '%s' for command '%s'", alias, cmd.name);
              commands[alias] = cmd;
          })
      }
  }); 

Object.keys(commands).forEach(function(name) {
  if ('description' in commands[name]) {
    logger.debug('command %s, %s', name, commands[name].description)
  }
});

// add the help command

function help(cmd) {
    return co(function* () {

        var msg = cmd.msg;
        var bot = cmd.bot;

        var toSend = [];
        Object.keys(commands).forEach(function (name) {
            if (name === commands[name].name) {
                toSend.push("**" + name + "** - " + commands[name].desc);
                if(commands[name].usage) {
                    toSend.push("  _usage: " + commands[name].usage + "_");
                }
                if (commands[name].alias.length > 0) {
                    toSend.push("  _aliases: " + commands[name].alias.join(" | ") + "_");
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

// event listeners
bot.on("error", function (msg) {
    logger.error(msg);
    // should we throw here?
});

bot.on("warn", function (msg) {
    logger.warn(msg);
});

bot.on("debug", function (msg) {
    logger.debug(msg);
});

bot.on("ready", function () {
    bot.setPlayingGame("with fire");
    logger.info("%s is ready!", bot.internal.user.username);
    logger.verbose("Listening to %s channels on %s servers", bot.channels.length, bot.servers.length);
    psn.scrape(bot);
    // scrape 
});

bot.on("disconnected", function () {
    logger.info("Disconnected from discord");
    /*
    setTimeout(() => {
        console.log("Attempting to log in...");
        bot.loginWithToken(config.token, (err, token) => {
            if (err) { console.log(err); setTimeout(() => { process.exit(1); }, 2000); }
            if (!token) { console.log(cWarn(" WARN ") + " failed to connect"); setTimeout(() => { process.exit(0); }, 2000); }
        });
    });
    /* */
});

bot.on("messageUpdated", function(msg0, msg1) {
    parseMessage(msg1);
})

bot.on("message", parseMessage);

function parseMessage(msg) {
    
    co(function* () {

        if (msg.author.id == bot.user.id) return;
        logger.debug("got message in channel %s: ",msg.channel.name, msg.content);

        if(msg.channel.name === config.discord.psnChannel) {
            // this means we are not accepting commands on the 
            // PSN channel...
            return psn.update(bot, msg);
        }

        var args = msg.content.trim().split(" ");
        var firstArg = args.shift().toLowerCase();

        // does it look like a command?
        logger.debug("looking for command in '%s'", firstArg);
        if(!firstArg.startsWith(config.commandPrefix)) return;
        var cmdName = firstArg.substring(config.commandPrefix.length);

        logger.debug("found command '%s'", cmdName);

        // yep, ok then see if we have that command loaded
        if(!commands[cmdName] || !commands[cmdName].exec) return;

        // check if it's an admin command
        if(commands[cmdName].admin && !isAdmin(msg)) {
            // see if we have the admin role
            return bot.sendMessage(msg, "Not authorised");
        }

        var cmd = {
            bot: bot,
            msg: msg,
            args: args,
            destiny: config.destiny.client,
            config: config
        };

        logger.debug("executing command '%s'", cmdName);
        // all looks good, so let's run the command
        yield commands[cmdName].exec(cmd);

    }).catch(function (err) {
        logger.error("Error when parsing msg '"+msg+"':"+err);
        bot.sendMessage(msg, "Oops, something went unexpectedly wrong\n```"+err+"```");
    });


}

function isAdmin(msg) {

    var roles = msg.channel.server.roles;

    for (var r = 0; r < roles.length; r++) {
        if (roles[r].name !== config.discord.adminRole) continue;
        // found the admin role
        return msg.author.hasRole(roles[r]);
    }
    return false;
}

function login() {

    return co(function* () {
        var token = yield bot.loginWithToken(config.discord.token);
        if (!token) {
            throw new Error("Failed to acquire token");
        }
        logger.info("Logged into discord with token: ", token);
    });

}

module.exports.login = login;
