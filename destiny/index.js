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
        } else {
            var r = JSON.parse(res.body);
            logger.debug("ErrorCode: %s, ThrottleSeconds: %s, ErrorStatus: %s, Message: %s",
                r.ErrorCode, r.ThrottleSeconds, r.ErrorStatus, r.Message);

            if(r.ErrorStatus !== 'Success') {
                throw new Error(r.ErrorStatus);
            }
            return (r);
        }

    });

}

function stats(type, id) {
    // /Stats/Account/{membershipType}/{destinyMembershipId}/

    return co(function *() {

        var r = yield membership(type, id);

        var op = util.format('/Stats/Account/%d/%s/', type, r.Response);
        return yield destinyAPI(op);

    });
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
    return co(function *() {

        var r = yield membership(type, id);

        var op = util.format('/%d/Account/%s/Summary/', type, r.Response);
        return yield destinyAPI(op);

    });
}

module.exports.stats = stats;
module.exports.search = search;
module.exports.summary = summary;