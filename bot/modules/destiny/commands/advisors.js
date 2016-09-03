'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var Table = require('cli-table2');
var api = require('../api');
var manifest = require('../manifest');
var message = require('../../../message');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;


function trials(format, input, activities) {
    return co(function* () {
        var activityName = activities[input].display.advisorTypeCategory;

        var items = activities[input].extended.winRewardDetails.rewardItemHashes

        // Check if rewardItems are available. If not, Trials is currently not active
        if (!items) {
            return (activityName + " is currently not active. I am essentially " +
                "a dumb AI with no frame, not a fortune teller");
        }

        var bounties = activities[input].bountyHashes;
        var toSend = ["```"+cmd.format];
        var firstline;
        firstline = "━━ " + activityName + " ";
        firstline += "━".repeat(40 - firstline.length);
        toSend.push(firstline);
        toSend.push("Location: " + activities[input].display.flavor);
        toSend.push("Bounties: " + activities[input].bountyHashes);
        toSend.push("   Items: " + activities[input].extended.winRewardDetails[0].rewardItemHashes);
        toSend.push("```");

        return toSend.join("\n");
    });

}

function dailyChapter(format, activities, definitions, destinations) {

    logger.verbose('reporting dailychapter');

    var input = 'dailychapter';
    var activityHash = activities[input].display.activityHash;
    var activityInfo = definitions.activities[activityHash];
    var destHash = activities[input].display.destinationHash;
    var tiers = activities[input].activityTiers;

    var toSend = ["```"+format];
    var firstline;
    firstline = "━━ " + activities[input].display.advisorTypeCategory + " ";
    firstline += "━".repeat(40 - firstline.length);
    toSend.push(firstline);
    toSend.push(" Objective: " + activityInfo.activityDescription);
    toSend.push("  Location: " + destinations[destHash].destinationName);
    toSend.push("     Level: " + tiers[0].activityData.displayLevel);
    toSend.push("     Light: " + tiers[0].activityData.recommendedLight);
    if (activityInfo.skulls.length) {
        toSend.push("    Skulls: " + activityInfo.skulls.map(function (s) { return s.displayName }).join(", "));
        activityInfo.skulls.forEach(function (s) {
            toSend.push("               " + s.description);
        });
    }

    if (tiers.length) {
        toSend.push("   Rewards: ");
        tiers.forEach(function (t) {
            t.rewards.forEach(function (r) {
                r.rewardItems.forEach(function (i) {
                    toSend.push("            " + i.value + " " + definitions.items[i.itemHash].itemName);
                });
            });
        });
    }
    toSend.push("```");
    return(toSend.join("\n"));
}

function heroicStrike(format, activities, definitions, destinations) {

    logger.verbose('reporting heroicstrike');
    var activity = activities['heroicstrike'];
    var activityHash = activity.display.activityHash;
    var activityInfo = definitions.activities[activityHash];
    var destHash = activity.display.destinationHash;
    var tiers = activity.activityTiers;
    var skulls = activity.extended.skullCategories[0].skulls;

    var detailTable = new Table({
        chars: {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': ''
            , 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': ''
            , 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': ''
            , 'right': '', 'right-mid': '', 'middle': ' | '
        },
        style: { 'padding-left': 0, 'padding-right': 0 },
        colWidths: [10, 40],
        wordWrap: true
    });

    var rewardsTable = new Table({
        chars: {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': ''
            , 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': ''
            , 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': ''
            , 'right': '', 'right-mid': '', 'middle': ' | '
        },
        style: { 'padding-left': 0, 'padding-right': 0 },
        colWidths: [10, 40],
        wordWrap: true
    });

    var skullsTable = new Table({
        chars: {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': ''
            , 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': ''
            , 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': ''
            , 'right': '', 'right-mid': '', 'middle': ' | '
        },
        style: { 'padding-left': 0, 'padding-right': 0 },
        colWidths: [10, 10, 30],
        wordWrap: true
    });

    //var toSend = ["```"+format];
    
    var firstline;
    firstline = "━━ " + activity.display.advisorTypeCategory + " ";
    firstline += "━".repeat(50 - firstline.length);
  
    detailTable.push([{hAlign:'right',content:'Objective'}, activityInfo.activityDescription]);
    detailTable.push([{hAlign:'right',content:'Location'}, destinations[destHash].destinationName]);
    detailTable.push([{hAlign:'right',content:'Level'}, tiers[0].activityData.displayLevel]);
    detailTable.push([{hAlign:'right',content:'Light'}, tiers[0].activityData.recommendedLight]);
    var firstSkull = true;
    skulls.forEach(function (s) {
        skullsTable.push([{hAlign:'right',content: (firstSkull ? "Skulls" : "")}, 
            { hAlign:'right',content: s.displayName } , s.description]);
        firstSkull = false;
    });
    var firstReward = true;
    tiers[0].rewards.forEach(function (r) {
        r.rewardItems.forEach(function (i) {
            rewardsTable.push([{hAlign:'right',content: (firstReward ? "Rewards" : "")},
                (i.value ? i.value + " " : "") + definitions.items[i.itemHash].itemName]);
            firstReward = false;
        });
    });

    return("```"+format+"\n"+ firstline+"\n"+
            detailTable.toString().replace(/ +\n/g, "\n")+"\n"+
            skullsTable.toString().replace(/ +\n/g, "\n")+"\n"+
            rewardsTable.toString().replace(/ +\n/g, "\n")+"```");
}

function exec(cmd) {

    return co(function *() {

        var msg = cmd.msg;
        var input = cmd.args[0] || 'all';
        //var activity = input.replace(/\s+/g, "");
        var busyMsg;

        try {
            busyMsg = yield message.send(msg, ":mag: Looking up Advisors", cmd.isPublic);
            // Retrieve latest Advisor Data
            var res = yield api.advisor();

            /**
             * == Response.data ==
             *
             * Contains : 
             * - activities, 
             * - activityCategories
             */
            var resData = res.data;

            /**
             * === Response.data.activities ===
             * 
             * Returns a list of all known the activities
             * - prisonofelders
             * - elderchallenge
             * - trials
             * - armsday
             * - weeklycrucible
             * - kingsfall
             * - vaultofglass
             * - crota
             * - nightfall
             * - heroicstrike
             * - dailychapter
             * - dailycrucible
             * - prisonofelders-playlist
             * - ironbanner
             * - xur
             * - srl
             * 
             * Extending this to include one of the above activities
             * will result in the following properties being exposed:
             * - identifier
             * - status
             * - display
             * - vendorHash
             * - bountyHashes
             * - extended
             */
            var activities = resData.activities;

            /**
             * === Response.data.activityCategories ===
             * 
             * This exposes a list of known category hashes. These do 
             * not appear anywhere else in the object and would need to 
             * referenced from the "DestinyActivityCategoryDefinition" 
             * collection of the database.
             * 
             * An example query to do this would look like:
             * db.getCollection(
             *      'destiny.manifest.en.DestinyActivityCategoryDefinition'
             * ).find({ hash: hash});
             */
            //var activityCategories = [resData].activityCategories;

            /**
             * == Response.definitions ==
             * 
             * This is only returned and part of the response body if the
             * query string, ?definitions=true, is passed when making the 
             * API call to the advisor URI. 
             * 
             * It contains a large list of hash look-ups, that you would 
             * otherwise have to make a database call to cross-reference.
             * 
             * - items
             * - buckets
             * - stats
             * - perks
             * - talentGrids
             * - statGroups
             * - progressionMappings
             * - itemCategories
             * - sources
             * - objectives
             * - progressions
             * - damageTypes
             * - materialRequirements
             * - unlockValues
             * - vendorDetails
             * - locations
             * - factions
             * - events
             * - vendorCategories
             * - vendorSummaries
             * - destinations
             * - activities
             * - books
             * - places
             * - activityTypes
             * - activityBundles
             * - enemyRaces
             * - flags
             */
            var definitions = res.definitions;

            /**
             * === Response.definitions.destinitions ===
             * 
             * Contains a list of destination hash objects
             * that contain destination info. This is used to
             * replace the destination hash found inside the 
             * `activities.display.destinationHash` property.
             * 
             * 518553403
             * 2512542997
             * 2777041980
             * 2897855902
             * 3393213630
             * 3393905939
             * 4072959335
             * 4233735899
             */
            var destinations = definitions.destinations;


            var toSend = [];
            switch (input.toLowerCase()) {
                case 'trials':
                    toSend.push(trials(cmd.format, input, activities))
                    break;
                case 'ds':
                case 'dailystory':
                case 'story':  
                    toSend.push(dailyChapter(cmd.format, activities, definitions, destinations));
                    break;
                case 'strike':
                    toSend.push(heroicStrike(cmd.format, activities, definitions, destinations));
                    break;            
                case 'all':
                    toSend.push(dailyChapter(cmd.format, activities, definitions, destinations));
                    toSend.push(heroicStrike(cmd.format, activities, definitions, destinations));
                    break;
            }
            return yield message.update(busyMsg, toSend);

        } catch (err) {
            var errmsg = "sorry, something unexpected happened: ```" + err + "```";

            if (busyMsg) {
                message.update(busyMsg, errmsg, 10000);
            } else {
                message.send(msg, errmsg, cmd.isPublic, 10000);
            }
        }

    });

}

module.exports = {
    desc: 'Get list of daily and weekly advisors',
    name: 'advisor',
    alias: ['ad'],
    exec: exec
}