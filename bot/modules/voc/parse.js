'use strict';

var co = require('co');
var logger = require('winston');
var moment = require('moment-timezone');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

var errors = [];
var warnings = [];

function parse(text) {

    var gamer = {}; 
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
    gamer.discord = id[0];
    var discord;
    var found = false;

    // check if it looks like a mention
    if(gamer.discord.match(/^\<\d+\>$/)) {
        discord = gamer.discord.replace(/[\<\>]/g, "");

        // yep, looks like a discord id, figure out who
        discord = bot.users.get("id", discord);
        if(!discord) {
            // ok, so it was a discord ID, but we
            // have no record of the user, so
            // we have to abort...
            errors.push("`"+ text + "` | unknown user id");
            return;
        }

        gamer.discord = discord.username;

    }

    // if we have two ID's then the second one should be the PSN
    // otherwise the PSN is the same as the discord ID
    gamer.psn = (id.length === 2) ? id[1] : gamer.discord;

    // now split out the games and trim any whitespace
    gamer.games = tokens[1].split(",").map(function (s) { return s.trim() }); 
    if(gamer.games.length === 1 && gamer.games[0].length === 0) {
        warnings.push("`@"+gamer.discord+"`: no games listed");
    }

    gamer.tz = tokens[2].trim();
    if(!moment.tz.zone(gamer.tz)) {
        warnings.push("`@"+gamer.discord+"`: unknown timezone: "+gamer.tz);
    }

    // set a flag to indicate if the entry has been modified
    // by the user/gamer
    gamer.modified = false;

    logger.debug("gamer: ", gamer);

    return gamer;

}

function scrape(channel) {

    return co(function* () {

        warnings.length = 0;
        errors.length = 0;

        logger.info("scraping PSN tags from %s/%s", channel.server.name, channel.name);
        var logs = yield channel.getLogs(100);
        var msg;
        // the logs appear in reverse order, so we need to 
        // process them in reverse (popped) to get them chronologically
        while (msg = logs.pop()) {

            // relax the match so that we can try and catch more 
            // parsing errors without erroring on general text
            var match = msg.content.match(/\-.+\|.+/g);
            var gamer;

            // no match, skip this one
            if (!match) continue;

            // we can have multiple PSN entries in each
            // message, so we just loop around each one
            var m;
            while(m = match.shift()) {
                gamer = parse(m);
                if (gamer) {
                    yield db.collection(config.modules.gamer.collection).updateOne(
                        { 
                            discord : gamer.discord,  
                            // only update non-modified entries
                            modified : false
                        },
                        { $set: gamer }, 
                        { upsert: true }    
                    );
                } else {
                    // errors.push(m);
                }
            }
        }

    });

}

module.exports.warnings = warnings;
module.exports.errors = errors;
module.exports.scrape = scrape;