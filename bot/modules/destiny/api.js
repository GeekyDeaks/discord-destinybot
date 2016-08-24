'use strict';

var request = require('request');
var co = require('co');
var thunkify = require('thunkify'); 
// require config from app scope



var util = require('util');
var logger = require('winston');

var get = thunkify(request.get);

var app = require.main.exports;
var config = app.config;

// API details here:
// https://www.bungie.net/platform/destiny/help/
// and here:
// http://destinydevs.github.io/BungieNetPlatform/

function destinyAPI(op) {

    return co(function* () {

        var args = {
            url: config.modules.destiny.url + op,
            headers: {
                'X-API-Key': config.modules.destiny.apikey
            }
        };
        logger.debug("issuing destiny API cmd: %s", args.url);
        // bit messy - request sends both the response and response.body
        // to the callback, so we have to pick appart the returned array
        var res = (yield get(args))[0];

        logger.debug("response code", res.statusCode);

        if (res.statusCode !== 200) {
            logger.error("destiny API error: %s\n", res.statusCode, res.body);
            throw new Error("Destiny API Failure: "+res.statusMessage);
        } else {
            var r = JSON.parse(res.body);
            logger.debug("ErrorCode: %s, ThrottleSeconds: %s, ErrorStatus: %s, Message: %s",
                r.ErrorCode, r.ThrottleSeconds, r.ErrorStatus, r.Message);

            if(r.ErrorStatus !== 'Success') {
                throw new Error("destiny API Failure: "+r.ErrorStatus);
            }
            if(!r.Response) {
                throw new Error("destiny API failure: no Response");
            }
            return (r.Response);
        }

    });

}

function stats(type, id) {
    // /Stats/Account/{membershipType}/{destinyMembershipId}/
    var op = util.format('/Stats/Account/%d/%s/', type, id);
    return destinyAPI(op);

}

function search(type, id) {
    // /SearchDestinyPlayer/{membershipType}/{displayName}/

    var op = util.format('/SearchDestinyPlayer/%d/%s/', type, id);
    return destinyAPI(op);
}

function membership(type, id) {
    // /{membershipType}/Stats/GetMembershipIdByDisplayName/{displayName}/

    var op = util.format('/%d/Stats/GetMembershipIdByDisplayName/%s/', type, id);
    return destinyAPI(op);
}

function summary(type, id) {
    // /{membershipType}/Account/{destinyMembershipId}/Summary/	

    var op = util.format('/%d/Account/%s/Summary/', type, id);
    return destinyAPI(op);
}

function manifest() {
    // /Manifest/
    var op = util.format('/Manifest/');
    return destinyAPI(op);
}

function advisor() {
    // /Advisors/V2/

    var op = util.format('/Advisors/V2/');
    return destinyAPI(op);
}


/**
 * To-Do (not yet implemented)
 * 
 * @var type membershipType
 * @var id destinyMemberShipId
 * @var charId characterId
 *
 * syntax of cmd would be:
 * /d advisor xbl unisys12 titan
 *
 * Will have to search for user first,
 * using search cmd above to find
 * the characterId. Possible this 
 * will not work on account with 
 * two of the same class. Could be 
 * possible to provide feedback to 
 * user in the form of looking up
 * the user account and return a list
 * of players characters. Followed
 * by asking which one they would Like
 * to search for and providing a 
 * cmd they can copy and past back
 * into chat. 
 */
function playerAdvisor(type, id) {
    // {membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Advisors/V2/

    var op = util.format('{type}/Account/{id}/Character/{characterId}/Advisors/V2/');
    return destinyAPI(op);
}

module.exports.stats = stats;
module.exports.search = search;
module.exports.summary = summary;
module.exports.manifest = manifest;
module.exports.advisor = advisor;