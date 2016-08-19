'use strict'

var co = require('co');
var util = require('util');
var logger = require('winston');
logger.level = 'debug';

var promisify = require('promisify-node');
var fs = promisify('fs');
var request = promisify('request');
var JSZip = require('jszip');
var path = require('path');
var mkdirp = promisify('mkdirp');
var ps = require('promise-streams');
var sqlite3 = require('sqlite3').verbose();

// fudge whilst we are running this directly...
var config = require('./config');
module.exports.config = config;

var api = require('./bot/modules/destiny/api');

function processTable(table) {
    logger.debug("Processing table: %s", table.name);
    //return Promise.resolve();
}


function processDb(dbfile) {
    logger.debug("loading DB: %s", dbfile);
    var db;
    // we are not able to promisify the DB constructor!!! <sigh>
    return new Promise(function (resolve, reject) {
        db = new sqlite3.Database(dbfile, sqlite3.OPEN_READONLY, function (err) {
            if (err) return reject(err);
            return resolve();
        });
    }).then(function () {
        logger.debug("DB opened successfully");
        // loop through the tables
        return new Promise(function (resolve, reject) {
            db.each("select name from sqlite_master where type='table'", function (err, table) {

                // does our error checking go out the window here?
                if (err) return reject(err);

                processTable(table);
            }, function (err, count) {
                if (err) return reject(err);
                resolve(count);
            });
        });


    }).then(function (count) {
        logger.debug("finished processing %s tables", count);
        logger.debug("closing DB");
        return db.close();
    });;

}


function update(lang) {

    // because we are using promises, we have issues with scope
    // so here are the variables we need between .then()s

    var dbfile;
    var zipobj;
    var tmpdir = path.join(config.appDir, 'tmp', 'destiny');
    var db;

    return api.manifest().
    then(function(manifest) {
       if(!manifest.mobileWorldContentPaths[lang]) {
            logger.error("Cannot find manifest for lang: %s", lang);
            return;
        }
        var mwcUrl = 'http://www.bungie.net' + manifest.mobileWorldContentPaths[lang];
        logger.debug("Retrieving Mobile World Contents from %s", mwcUrl);
        return request.get({ url: mwcUrl, encoding: null });
    }).then(function (res, body) {
        if (res.statusCode !== 200) {
            logger.error("failed to download mobileWorldContent: %s\n", res.statusCode);
            throw new Error("download failure: " + res.statusMessage);
        } else {
            logger.debug("Unzipping manifest file...");
            var zip = new JSZip();
            return zip.loadAsync(res.body);
        }
    }).then(function (zip) {
        var files = zip.file(/.content$/);
        // there should only be one file
        if(files.length > 1) throw new Error("More than one DB in manifest ZIP");
        zipobj = files.shift();
        dbfile = path.join(tmpdir, zipobj.name);
        logger.debug("creating dir: %s", tmpdir);
        return mkdirp(tmpdir);
    }).then(function () {
        logger.debug("extracting file: %s, to: %s", zipobj.name, dbfile);
        return ps.wait(zipobj.
                nodeStream().
                pipe(fs.createWriteStream(dbfile)));
    }).then(function () {
        return processDb(dbfile);
    });

}


if(process.argv.length > 2) {
    update(process.argv[2]).
        then(function () {
            console.log("finished updating manifest");
        });
} else {
    console.log('Usage: manifest_update [lang]');
}