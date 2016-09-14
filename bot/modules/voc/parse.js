'use strict';

var co = require('co');
var logger = require('winston');
var moment = require('moment-timezone');
var gamer = require('../gamer');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

var errors = [];
var warnings = [];

function parse(channel, text) {

    var gamer = {}; 
    var server = channel.guild;
    logger.debug("parsing %s", text);
    var tokens = text.split("|");
  
    // skip anything without exactly 3 tokens
    if(tokens.length < 3) {
        errors.push("`"+ text + "` | missing '|'");
        return;
    }
    if(tokens.length > 3) {
        errors.push("`"+ text + "` | additional '|'");
        return;
    }
    
    // parse the PSN gamertag
    var id = tokens[0].substring(1).trim().
            replace(/[@\\()]/g,"").
            replace(/ +/, " ").
            split(" ");

    // no ID's found
    if(id.length === 0) {
        errors.push("`"+ text + "` | no ID's found");
        return;
    } 
    if(id.length > 2) {
        errors.push("`"+ text + "` | more than 2 ID's found");
        return;
    }

    // we expect the first ID to be the discord one
    var name = id[0];
    var discord;

    // check if it looks like a mention
    if(name.match(/^\<\d+\>$/)) {
        // yep, looks like a discord id, figure out who
        name = name.replace(/[\<\>]/g, "");

        discord = server.members.get(name);
        if(!discord) {
            // ok, so it was a discord ID, but we
            // have no record of the user, so
            // we have to abort...
            errors.push("`"+ text + "` | unknown user id");
            return;
        }



    } else {
        discord = server.members.find(m => m.user.username === name);
        if(!discord) {
            errors.push("`"+ text + "` | unknown user name");
            return;
        }
    }
    gamer.discord = {
        name : discord.username,
        id : discord.id
    };

    // if we have two ID's then the second one should be the PSN
    // otherwise the PSN is the same as the discord ID
    gamer.psn = (id.length === 2) ? id[1] : gamer.discord.name;

    // now split out the games and trim any whitespace
    gamer.games = tokens[1].split(",").map(function (s) { return s.trim() }); 
    if(gamer.games.length === 1 && gamer.games[0].length === 0) {
        warnings.push("`@"+gamer.discord.name+"`: no games listed");
    }

    gamer.tz = tokens[2].trim();
    if(!moment.tz.zone(gamer.tz)) {
        warnings.push("`@"+gamer.discord.name+"`: unknown timezone: "+gamer.tz);
    }

    // set a flag to indicate if the entry has been modified
    // by the user/gamer
    gamer.modified = false;

    logger.debug("gamer: ", gamer);

    return gamer;

}

function update(msg) {
    return co(function* () {
        // relax the match so that we can try and catch more 
        // parsing errors without erroring on general text
        var match = msg.content.match(/\-.+\|.+/g);
        var vgamer;

        // no match, skip this one
        if (!match) return;

        // we can have multiple PSN entries in each
        // message, so we just loop around each one
        var m;
        while (m = match.shift()) {
            vgamer = parse(msg.channel, m);
            if (vgamer) {
                // try and find our gamer
                var g = yield gamer.findById(vgamer.discord.id);

                if(g && g.modified) {
                    warnings.push("`@"+g.discord.name+"`: skipped, user modified");
                    continue;
                }
                // upsert the entry
                yield gamer.upsert(vgamer);
            } else {
                // errors.push(m);
            }
        }
    });


}

function scrape(channel) {

    return co(function* () {

        warnings.length = 0;
        errors.length = 0;

        logger.info("scraping PSN tags from %s/%s", channel.guild.name, channel.name);
        var msgCol = yield channel.fetchMessages({limit: 100});
        var logs = msgCol.array();
        var msg;
        // the logs appear in reverse order, so we need to 
        // process them in reverse (popped) to get them chronologically
        while (msg = logs.pop()) {
            yield update(msg);
        }

    });

}

module.exports.warnings = warnings;
module.exports.errors = errors;
module.exports.update = update;
module.exports.scrape = scrape;