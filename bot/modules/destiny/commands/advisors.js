'use strict';

var co = require('co');
var util = require('util');
var logger = require('winston');
var Table = require('cli-table2');
var api = require('../api');
var manifest = require('../manifest');
var message = require('../../../message');
var moment = require('moment');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;

var lineLength = 47;

var detailBorders = {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': ''
            , 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': ''
            , 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': ''
            , 'right': '', 'right-mid': '', 'middle': ' | '
};

var noBorders = {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': ''
            , 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': ''
            , 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': ''
            , 'right': '', 'right-mid': '', 'middle': ''
};


function trials(format, activities, definitions, destinations) {

    
    var activity = activities.trials;
    logger.verbose('reporting ' + activity.display.advisorTypeCategory);
    
    var toSend = ["```" + format];

    var titleLine;
    titleLine = "-- " + activity.display.advisorTypeCategory + " ";
    titleLine += "-".repeat(lineLength - titleLine.length);
    toSend.push(titleLine);

    // check if it's active
    var status = activity.status;

    var detailTable = new Table({
        chars: detailBorders,
        style: { 'padding-left': 0, 'padding-right': 0 },
        colWidths: [10, lineLength - 10 - 3],
        wordWrap: true
    });

    detailTable.push([{ hAlign: 'right', content: 'Status' }, status.active ? "Active" : "Inactive"]);
    if(status.active && status.expirationKnown) {
        detailTable.push([{ hAlign: 'right', content: 'Ends' }, moment(status.expirationDate).fromNow()]);
    }
    toSend.push(detailTable.toString().replace(/ +\n/g, "\n"));

    // rewards
    // this does not appear to be defined in the hash, need to check the db
    /* 
    activity.extended.winRewardDetails.forEach(function (reward) {
        var rewardRank;
        rewardRank = "## Reward Rank " + reward.rewardRank + " ";
        rewardRank += "#".repeat(lineLength - rewardRank.length);
        toSend.push(rewardRank);

        var rewardTable = new Table({
            chars: detailBorders,
            style: { 'padding-left': 0, 'padding-right': 0 },
            colWidths: [10, lineLength - 10 - 3],
            wordWrap: true
        });

        reward.rewardRank;
        reward.rewardItemHashes.forEach(function (item) {
            if(!definitions.items[item]) return;
            rewardTable.push([{hAlign:'right',content: definitions.items[item].itemTypeName}, definitions.items[item].itemName]);
        });
        toSend.push(rewardTable.toString().replace(/ +\n/g, "\n"))

    });
    /**/
    toSend.push("```");

    return toSend.join("\n");
}

//
// Report on an activity with a single tier of rewards
// 
function singleTier(format, activity, definitions, destinations) {

    logger.verbose('reporting ' + activity.display.advisorTypeCategory);

    var activityHash = activity.display.activityHash;
    var activityInfo = definitions.activities[activityHash];
    var destHash = activity.display.destinationHash;
    var tiers = activity.activityTiers;
    var skulls =  activity.extended ? activity.extended.skullCategories[0].skulls : activityInfo.skulls;

    var detailTable = new Table({
        chars: detailBorders,
        style: { 'padding-left': 0, 'padding-right': 0 },
        colWidths: [10, lineLength - 10 - 3],
        wordWrap: true
    });

    var rewardsTable = new Table({
        chars: noBorders,
        style: { 'padding-left': 0, 'padding-right': 0 },
        colWidths: [5, lineLength - 5],
        wordWrap: true
    });

    var skullsTable = new Table({
        chars: detailBorders,
        style: { 'padding-left': 0, 'padding-right': 0 },
        colWidths: [10, lineLength - 10 - 3],
        wordWrap: true
    });
    
    var toSend = ["```"+format];
    
    var titleLine;
    titleLine = "-- " + activity.display.advisorTypeCategory + " ";
    titleLine += "-".repeat(lineLength - titleLine.length);
    toSend.push(titleLine);
  
    detailTable.push([{hAlign:'right',content:'Name'}, activityInfo.activityName]);
    detailTable.push([{hAlign:'right',content:'Objective'}, activityInfo.activityDescription]);
    detailTable.push([{hAlign:'right',content:'Location'}, destinations[destHash].destinationName]);
    detailTable.push([{hAlign:'right',content:'Level'}, tiers[0].activityData.displayLevel]);
    detailTable.push([{hAlign:'right',content:'Light'}, tiers[0].activityData.recommendedLight]);

    toSend.push(detailTable.toString().replace(/ +\n/g, "\n"));

    var skullHeader = "## Modifiers ";
    skullHeader += "#".repeat(lineLength - skullHeader.length);
    toSend.push(skullHeader);
    skulls.forEach(function (s) {
        skullsTable.push([{ hAlign:'right',content: s.displayName } , s.description]);
    });
    toSend.push(skullsTable.toString().replace(/ +\n/g, "\n"));

    var rewardHeader = "## Rewards ";
    rewardHeader += "#".repeat(lineLength - rewardHeader.length);
    toSend.push(rewardHeader);
    tiers[0].rewards.forEach(function (r) {
        r.rewardItems.forEach(function (i) {
            rewardsTable.push(["",
                (i.value ? i.value + " " : "") + definitions.items[i.itemHash].itemName]);
        });
    });
    toSend.push(rewardsTable.toString().replace(/ +\n/g, "\n"));
    toSend.push("```");

    return(toSend.join("\n"));
}


function exec(cmd) {

    return co(function *() {

        var msg = cmd.msg;
        var input = cmd.args[0] || 'all';
        //var activity = input.replace(/\s+/g, "");
        var busyMsg;

        try {
            busyMsg = yield message.send(msg, ":mag: Looking up Advisors", cmd.pm);
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
                    toSend.push(trials(cmd.format, activities, definitions, destinations));
                    break;
                case 'ds':
                case 'daily':
                case 'dailystory':
                case 'story':  
                    toSend.push(singleTier(cmd.format, activities['dailychapter'], definitions, destinations));
                    break;
                case 'strike':
                    toSend.push(singleTier(cmd.format, activities['heroicstrike'], definitions, destinations));
                    toSend.push(singleTier(cmd.format, activities['nightfall'], definitions, destinations));
                    break;            
                case 'all':
                    //toSend.push(dailyChapter(cmd.format, activities, definitions, destinations));
                    //toSend.push(heroicStrike(cmd.format, activities, definitions, destinations));
                    toSend.push(singleTier(cmd.format, activities['dailychapter'], definitions, destinations));
                    toSend.push(singleTier(cmd.format, activities['heroicstrike'], definitions, destinations));
                    toSend.push(singleTier(cmd.format, activities['nightfall'], definitions, destinations));
                    toSend.push(trials(cmd.format, activities, definitions, destinations));
                    break;
                default:
                    return yield message.update(busyMsg, "Sorry, not sure what to lookup for `"+input+"`", 10000);
            }
            return yield message.update(busyMsg, toSend);

        } catch (err) {
            var errmsg = "sorry, something unexpected happened: ```" + err + "```";

            if (busyMsg) {
                message.update(busyMsg, errmsg, 10000);
            } else {
                message.send(msg, errmsg, cmd.pm, 10000);
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