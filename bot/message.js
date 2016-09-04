'use strict';

var logger = require('winston');
var co = require('co');

var app = require.main.exports;
var config = app.config;
var bot = app.bot;

var maxMessageSize = config.discord.maxMessageSize || 1930;

function build(content) {
    // keep poping stuff off content until we have nothing left

    var msg = '';
    while(content.length) {
        if(content[0].length + msg.length > maxMessageSize) {
            // return what we have
            return msg;
        }
        msg += "\n" + content.shift();
    }

    return msg;
}


function update(prevMsg, content, expire) {

    return co(function* () {
        var m;

        var pm = prevMsg.channel.isPrivate;

        // build up the message
        if (Array.isArray(content)) {
            // replace with as much as we can
        
            m = yield bot.updateMessage(prevMsg, build(content));

            if(content.length) {
                yield _send(prevMsg, content, expire);
            }
        } else {
            m = yield bot.updateMessage(prevMsg, content);

        }

        if(expire && !pm) bot.deleteMessage(m, {"wait": expire});
        return m;
    });

    
}

function send(msg, content, pm, expire) {
    
    // check if we should respond privately
    return _send(pm ? msg.author : msg, content, expire);

}

function _send(dest, content, expire) {

    return co(function* () {
        var m;

        // check if the destination is either a user or a 
        // private channel
        var pm = dest.constructor.name === "User" || dest.channel.isPrivate;

        // build up the message
        if (Array.isArray(content)) {
            // replace with as much as we can

            while(content.length) {
                m = yield bot.sendMessage(dest, build(content));
                if(expire && !pm) bot.deleteMessage(m, {"wait": expire});
            }

        } else {
            m = yield bot.sendMessage(dest, content);
            if(expire && !pm) bot.deleteMessage(m, {"wait": expire});
        }

        return m;
    });

}

module.exports.send = send;
module.exports.update = update;