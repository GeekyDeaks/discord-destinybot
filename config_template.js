'use strict';

module.exports = {

    discord: {
        token: "DISCORD_TOKEN",
        adminRole: "Modteam"
    },
    modules: {
        db : {
            url: "mongodb://localhost:27017/des"
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
            psnChannel: "psn"
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