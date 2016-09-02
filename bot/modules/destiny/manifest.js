'use strict';

var co = require('co');
var logger = require('winston');
var app = require.main.exports;
var config = app.config;
var db = app.db;


function getDestinyActivityDefinition(hash, lang) {
    var col = config.modules.destiny.collection+'.'+(lang || 'en') +'.DestinyActivityDefinition';
    return db.collection(col).findOne({ hash: hash });
}

function getDesintyActivityCategoryDefinition(hash, lang) {
    var col = config.modules.destiny.collection+'.'+(lang || config.language)+'DesintyActivityCategoryDefinition';
    return db.collection(col).findOne({ hash: hash });
}

function getDestinyInventoryItemDefinition(hash, lang) {
    var col = config.modules.destiny.collection+'.'+(lang || config.language)+'DestinyInventoryItemDefinition';
    return db.collection(col).findOne({ '_id': hash });
}

module.exports.getDestinyActivityDefinition = getDestinyActivityDefinition;
module.exports.getDesintyActivityCategoryDefinition = getDesintyActivityCategoryDefinition;
