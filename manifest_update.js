'use strict'

var co = require('co');
var util = require('util');
var logger = require('winston');
logger.level = 'debug';

var promisify = require('promisify-node');
var thunkify = require('thunkify');
var fs = promisify('fs');
var request = promisify('request');
var JSZip = require('jszip');
var path = require('path');
var mkdirp = require('mkdirp');
var ps = require('promise-streams');
var sqlite3 = require('sqlite3').verbose();
var MongoClient = require('mongodb').MongoClient;

// fudge whilst we are running this directly...
var config = require('./config');
module.exports.config = config;

var api = require('./bot/modules/destiny/api');

var sdb;  // sqlite3 handle
var mdb;  // mongodb handle
var lang;  // global lang

function processTable(table) {

    return co(function* () {
        logger.debug("Processing table: %s", table.name);

        var rows = yield new Promise(function (resolve, reject) {

            sdb.all("select * from " + table.name, function (err, rows) {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        logger.debug("read %s rows from %s", rows.length, table.name);
        var json;

        for (var r = 0; r < rows.length; r++) {

            json = JSON.parse(rows[r].json);

            json._id = json.hash || json.statId || rows[r].id;

            if (!json._id && json._id !== 0) {
                logger.error("no id found in table: %s\nid: %s\njson: %s", table.name, rows[r].id, rows[r].json);
                //process.exit();
                return;
            }

            yield mdb.collection(config.modules.destiny.collection+'.' + lang + '.' + table.name).replaceOne(
                    { "_id": json._id }, json, { upsert: true });

        }

        logger.debug("processed %s rows", rows.length);

    });

}


function update() {

    return co(function * () {

        var tmpdir = path.join(config.appDir, 'tmp', 'destiny');
        var manifest = yield api.manifest();

        if(!manifest.mobileWorldContentPaths[lang]) {
            logger.error("Cannot find manifest for lang: %s", lang);
            return;
        }
        var mwcUrl = 'http://www.bungie.net' + manifest.mobileWorldContentPaths[lang];
        logger.debug("Retrieving Mobile World Contents from %s", mwcUrl);
        var res = yield request.get({ url: mwcUrl, encoding: null });

        if (res.statusCode !== 200) {
            logger.error("failed to download mobileWorldContent: %s\n", res.statusCode);
            throw new Error("download failure: " + res.statusMessage);
        }
        logger.debug("Unzipping manifest file...");
        var zip = new JSZip();
        yield zip.loadAsync(res.body);

        var files = zip.file(/.content$/);
        // there should only be one file
        if (files.length > 1) throw new Error("More than one DB in manifest ZIP");
        var zipobj = files.shift();
        var dbfile = path.join(tmpdir, zipobj.name);
        logger.debug("creating dir: %s", tmpdir);
        mkdirp.sync(tmpdir);

        logger.debug("extracting file: %s, to: %s", zipobj.name, dbfile);
        // wait until the file has finished unzipping
        yield ps.wait(zipobj.
                nodeStream().
                pipe(fs.createWriteStream(dbfile)));


        logger.debug("loading DB: %s", dbfile);
        // we are not able to promisify the DB constructor!!! <sigh>
        yield new Promise(function (resolve, reject) {
            sdb = new sqlite3.Database(dbfile, sqlite3.OPEN_READONLY, function (err) {
                if (err) return reject(err);
                return resolve();
            });
        });

        logger.debug("SQLite DB opened successfully");

        mdb = yield MongoClient.connect(config.modules.db.url);

        logger.debug("Connected to mongoDB");

        var tables = yield new Promise(function (resolve, reject) {
            sdb.all("select name from sqlite_master where type='table'", function (err, tables) {

                // does our error checking go out the window here?
                if (err) return reject(err);
                resolve(tables);
            });
        });

        for(var t = 0; t < tables.length; t++) {
            yield processTable(tables[t]);
        }

    });

}


if(process.argv.length > 2) {
    lang = process.argv[2];
    update().
        then(function () {
            console.log("finished updating manifest");
            sdb.close();
            mdb.close();
        }).catch(function (err) {
            console.error(err);
            // we have to forceably exit for some reason...
            process.exit();
        });
} else {
    console.log('Usage: manifest_update [lang]');
}