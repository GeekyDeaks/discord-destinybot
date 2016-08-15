'use strict';

var request = require('request');
var co = require('co');
var thunkify = require('thunkify'); 
var config = require('../config');
var util = require('util');
var logger = require('winston');

var get = thunkify(request.get);

// API details here:
// https://www.bungie.net/platform/destiny/help/

function destinyAPI(op) {

    return co(function* () {

        var args = {
            url: config.destiny.url + op,
            headers: {
                'X-API-Key': config.destiny.apikey
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

module.exports.stats = stats;
module.exports.search = search;
module.exports.summary = summary;