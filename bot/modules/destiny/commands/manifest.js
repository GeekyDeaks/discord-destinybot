'use strict'

var co = require('co');
var util = require('util');
var logger = require('winston');
var thunkify = require('thunkify');
var request = require('request');
var get = thunkify(request.get); 
var fs = require('fs');
var JSZip = require("jszip");
var path= require('path');

var api = require('../api');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;


function exec(cmd) {

    return co(function *() {
        var msg = cmd.msg;

        var busyMsg = yield bot.sendMessage(msg, "Pulling latest Destiny Manifest"+"** :mag:");
        var manifest = yield api.manifest();

        // manifest already contains what we want...
        //var worldContents = JSON.stringify(manifest);
        //var mobileWorldContents = JSON.parse(worldContents);
        var mwcUrl = 'http://www.bungie.net'+manifest.mobileWorldContentPaths.en;
        logger.debug("Retrieving Mobile World Contents from %s", mwcUrl);

        // request defaults to UTF-8 encoding
        // http://stackoverflow.com/questions/14855015/getting-binary-content-in-node-js-using-request
        // make sure encoding: null

        var res = (yield get({ url: mwcUrl, encoding: null}))[0];

        if (res.statusCode !== 200) {
            logger.error("failed to download mobileWorldContent: %s\n", res.statusCode);
            throw new Error("download failure: "+res.statusMessage);
        } else {
            logger.debug("Reading manifest file...");
            var zip = new JSZip()

            yield zip.loadAsync(res.body);

            // get a list of content files
            var files = zip.file(/.content$/);
            var dbfile;
            // loop around the old fashioned way because we are using yield...
            for(var f = 0; f < files.length; f++) {
                dbfile = path.join(config.appDir, 'persist', 'destiny', files[f].name);
                logger.debug("extracting file: %s, to: %s", files[f].name, dbfile);
                // TODO: make sure the directory exists - might want to think about
                // using this: https://github.com/jrajav/mkpath

                // wow, the docs for jszip are really terse...
                // https://stuk.github.io/jszip/documentation/api_zipobject/node_stream.html
                files[f].nodeStream().pipe(fs.createWriteStream(dbfile));
            }

        }

    });

}

module.exports = {
    desc: 'Get latest Destiny Manifest file',
    name: 'manifest',
    alias: ['man'],
    exec: exec
}