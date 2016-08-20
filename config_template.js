'use strict';

module.exports = {

    discord: {
        token: "DISCORD_TOKEN",
        adminRole: "Modteam"
    },
    modules: {
        db : {
            // Update url with actual mongo connection string. 
            url: "mongodb://localhost:27017/des",
            // all options are optional
            options: { 
                uri_decode_auth: ""
                db: "",
                server: "",
                replSet: "",
                promiseLibrary: ""
            }
        },
        destiny: {
            apikey: "BUNGIE_TOKEN",
            url: "https://www.bungie.net/Platform/Destiny",
            defaultType: 2,
            collection: "destiny.manifest"
        },
        voc: {
            psnChannel: "psn"
        },
        welcome: {
            
        }
    },
    commandPrefix: "d!",
    appDir: "",
    language: "en"
};