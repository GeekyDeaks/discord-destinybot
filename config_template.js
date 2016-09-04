'use strict';

module.exports = {

    discord: {
        token: "DISCORD_TOKEN",
        adminRole: "Modteam",
        defaultServer: ""
    },
    modules: {
        db : {
            // Update url with actual mongo connection string. 
            url: "mongodb://localhost:27017/des",
            // all options are optional
            /*options: { 
                uri_decode_auth: ""
                db: "",
                server: "",
                replSet: "",
                promiseLibrary: ""
            }*/
        },
        role : {
            collection: "roles"
        },
        destiny: {
            apikey: "BUNGIE_TOKEN",
            url: "https://www.bungie.net/Platform/Destiny",
            defaultType: 2,
            collection: "destiny.manifest"
        },
        voc: {
            psnChannel: "psn",
            mvote : {
                adminRole : "Modteam",
                voteRole : "Member",
                collection: "voc.mvote",
                port: 8000,
                host: '127.0.0.1'
            }
        },
        welcome: {},
        util : {},
        gamer: {
            collection: "gamers"
        }
    },
    commandPrefix: "d!",
    appDir: "",
    language: "en"
};