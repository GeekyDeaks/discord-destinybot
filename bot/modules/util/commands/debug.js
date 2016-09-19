'use strict';
var co = require('co');
var message = require('../../../message');
var Table = require('cli-table2');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;


var lineLength = 47;

var detailBorders = {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': ''
            , 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': ''
            , 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': ''
            , 'right': '', 'right-mid': '', 'middle': ' | '
};

function exec(cmd) {

    return co(function* () {
        var msg = cmd.msg;


        var detailTable = new Table({
            chars: detailBorders,
            style: { 'padding-left': 0, 'padding-right': 0 },
            colWidths: [10, lineLength - 10 - 3],
            colAligns: [ 'right', 'left'],
            wordWrap: true
        });

        detailTable.push(['name', config.pkg.name]);
        detailTable.push(['v', config.pkg.version]);
        detailTable.push(['Node', process.version]);
        detailTable.push(['execPath', process.execPath]);
        


        return message.send(msg, "```"+detailTable.toString()+"```", cmd.pm);

    });

}

module.exports = {
    desc: 'Output some debug info',
    name: 'debug',
    usage: undefined,
    alias: [],
    exec: exec,
    admin: true
};