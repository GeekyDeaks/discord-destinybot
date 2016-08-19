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
        var lang;
        var langOptions = ['en',"fr",'es','de','it','ja','pt-br']
        var langFlag = cmd.args[0];
        var busyMsg = yield bot.sendMessage(msg, "Pulling latest Destiny Manifest"+"** :mag:");
        var manifest = yield api.manifest();

        if (langOptions.indexOf(langFlag) > -1) {
            lang = langFlag;
            logger.debug("Valid Language flag detected as option: " + langFlag);
        } else {
            logger.debug("No Language Flag entered or invaild language option specifed.");
            logger.debug("Defaulting to config option: " + config.language);
            lang = config.language;
        }
        
        var mwcUrl = 'http://www.bungie.net'+manifest.mobileWorldContentPaths[lang];        
        logger.debug("Retrieving Mobile World Contents from %s", mwcUrl);

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
                
                files[f].nodeStream().pipe(fs.createWriteStream(dbfile, {"flags": "w+"}));

                fs.stat(dbfile, function(err, stats) {
                    if (err) {
                        logger.error("There is a problem with the manifest file: " + err);
                    }

                    return bot.updateMessage(busyMsg, "New Destiny Manifest file has been successfully downloaded!"+"** :thumbsup:");
                });
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