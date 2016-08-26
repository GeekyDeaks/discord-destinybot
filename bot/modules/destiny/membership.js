'use strict';

var app = require.main.exports;
var config = app.config;

var XBL = 1;
var PSN = 2;

// Determine MembershipType by checking user input of console
function type(cmd) {
    var tag = cmd.args.shift();
    if(tag) {
        switch (tag.toLowerCase()) {
            case 'xbl':
            case 'xbox':
                return [XBL];
            case 'psn':
            case 'playstation':
                return [PSN];
        }
        // put the argument back
        cmd.args.unshift(tag);
    }
    return [ XBL, PSN ];

}

function name(type) {
    switch(type) {
        case 1: return 'XBL';
        case 2: return 'PSN';
    }
}

module.exports.XBL = XBL;
module.exports.PSN = PSN;
module.exports.name = name;
module.exports.type = type;