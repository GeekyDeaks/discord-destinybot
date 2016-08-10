'use strict';

var co = require('co');
var logger = require('winston');
var config = require('../config');
var moment = require('moment-timezone');

var gamers = {};
var errors = [];
var warnings = [];

function lookup(discord) {
    return gamers[discord];
}

function players(game) {
    //
    var p = [];
    for(var g in gamers) {
        if(gamers[g].games.indexOf(game) !== -1) {
            p.push(gamers[g]);
        }
    }
    return p;
}


function parse(bot, text) {

    var gamer = {}; 
    logger.debug("parsing %s", text);
    var tokens = text.split("|");
    tokens.forEach(function (t) {
        logger.debug("Token: "+t);
    });    
    // skip anything without exactly 3 tokens
    if(tokens.length != 3) return;

    // parse the gamertag
    var id = tokens[0].substring(1).trim().
            replace(/[@\\()]/g,"").
            replace(/ +/, " ").
            split(" ");

    logger.debug("id count: %d", id.length);

    if(id.length === 0 || id.length > 2) return;
    gamer.discord = id[0];
    var discord;
    var found = false;
    if(gamer.discord.match(/^\<\d+\>$/)) {
        discord = gamer.discord.replace(/[\<\>]/g, "");
        // looks like a discord id
        for(var u = 0; u < bot.users.length; u++) {
            if(bot.users[u].id === discord ) {
                gamer.discord = bot.users[u].username;
                found = true;
                break;
            }
        }
        if(!found) return;
    }

    gamer.psn = (id.length === 2) ? id[1] : gamer.discord;

    gamer.games = tokens[1].split(",").map(function (s) { return s.trim() }); 
    if(gamer.games.length === 1 && gamer.games[0].length === 0) {
        warnings.push("@"+gamer.discord+": no games listed");
    }
    gamer.tz = tokens[2].trim();
    if(!moment.tz.zone(gamer.tz)) {
        warnings.push("@"+gamer.discord+": unknown timezone: "+gamer.tz);
    }

    logger.debug("gamer: ", gamer);

    return gamer;

}

// parse the msg for PSN ID's 

function update(bot, msg) {
    // relax the match so that we can try and catch more 
    // parsing errors without erroring on general text
    var m = msg.content.match(/\-.+\|.+/g);
    var gamer;

    if(!m) return;

    for (var i = 0; i < m.length; i++) {
        gamer = parse(bot, m[i]);
        if(gamer) {
            gamers[gamer.discord] = gamer;
        } else {
            errors.push(m[i]);
        }
    }

}

// scrape the topic for PSN ID's 
function scrape(bot) {

    // clear down the errors
    errors.length = 0;
    warnings.length = 0;

    // clear down the gamers
    for (var g in gamers) delete gamers[g];

    return co(function* () {
        for(var c = 0; c < bot.channels.length; c++) {
            if(bot.channels[c].name === config.discord.psnChannel) {
                // found a PSN channel
                var logs = yield bot.getChannelLogs(bot.channels[c]);
                // the logs appear in reverse order, so we need to 
                // process them in reverse to get them chronologically
                for(var l = logs.length - 1; l >= 0; l--) {
                    update(bot, logs[l]);
                } 
            }
        }
    });

    
}

module.exports.lookup = lookup;
module.exports.players = players;
module.exports.scrape = scrape;
module.exports.update = update;
module.exports.errors = errors;
module.exports.gamers = gamers;
module.exports.warnings = warnings;