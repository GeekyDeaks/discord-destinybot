'use strict';

var app = require.main.exports;
var config = app.config;

// Determine MembershipType by checking user input of console
function type(cmd) {
    var tag = cmd.args.shift();
    switch (tag) {
        case 'xbl':
        case 'xbox':
            return '1';
        case 'psn':
        case 'playstation':
            return '2';
        default:
            cmd.args.unshift(tag);
            return config.modules.destiny.defaultType;
    }
}

module.exports.type = type;