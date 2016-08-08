'use strict';

var co = require('co');
var logger = require('winston');
var config = require('../config');


var gamers = {};

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


function parse(text) {

    var gamer = {}; 
    logger.debug("parsing %s", text);
    var tokens = text.split("|");
    tokens.forEach(function (t) {
        logger.debug("Token: "+t);
    });    
    // skip anything without exactly 3 tokens
    if(tokens.length != 3) return;

    // parse the gamertag
    var id = tokens[0].substring(1).trim().replace(/[@\\()]/g,"").split(" ");

    logger.debug("id count: %d", id.length);

    if(id.length === 0 || id.length > 2) return;
    gamer.discord = id[0];
    gamer.psn = (id.length === 2) ? id[1] : id[0];

    gamer.games = tokens[1].split(",").map(function (s) { return s.trim() }); 
    gamer.tz = tokens[2].trim();

    logger.debug("gamer: ", gamer);

    return gamer;

}

// scrape the topic for PSN ID's 

function update(msg) {
    var m = msg.content.match(/\-.+\|.*\|.+/g);
    var gamer;

    for (var i = 0; i < m.length; i++) {
        gamer = parse(m[i]);
        if(gamer) {
            gamers[gamer.discord] = gamer;
        } 
    }

}

function scrape(bot) {
    return co(function* () {
        for(var c = 0; c < bot.channels.length; c++) {
            if(bot.channels[c].name === config.discord.psnChannel) {
                // found a PSN channel
                var logs = yield bot.getChannelLogs(bot.channels[c]);
                for(var l = 0; l < logs.length; l++) {
                    update(logs[l]);
                } 
            }
        }
    });

    
}

module.exports.lookup = lookup;
module.exports.players = players;
module.exports.scrape = scrape;
module.exports.update = update;