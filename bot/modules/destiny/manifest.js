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


module.exports.getDestinyActivityDefinition = getDestinyActivityDefinition;

