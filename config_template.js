'use strict';

module.exports = {

    discord: {
        token: "DISCORD_TOKEN",
        adminRole: "Mod team",
        defaultServer: "",
        pm: false
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
