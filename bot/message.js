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
            var text = build(content);
            logger.debug("updating message to [%s], length: %s", pm ? prevMsg.channel.recipient.name : prevMsg.channel.name, text.length);
            m = yield bot.updateMessage(prevMsg, text);

            if(content.length) {
                yield _send(prevMsg, content, expire);
            }
        } else {
            logger.debug("updating message to [%s], length: %s", pm ? prevMsg.channel.recipient.name : prevMsg.channel.name, content.length);
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
        var pm;
        var recipient;

        if(dest.constructor.name === "User") {
            pm = true;
            recipient = dest.name;
        } else if(dest.channel.isPrivate) {
            pm = true;
            recipient = dest.channel.recipient.name;
        } else {
            pm = false;
            recipient = dest.channel.name;
        }

        // build up the message
        if (Array.isArray(content)) {
            // replace with as much as we can

            while(content.length) {
                var text = build(content);
                logger.debug("Sending message to [%s], length: %s", recipient, text.length);
                m = yield bot.sendMessage(dest, text);
                if(expire && !pm) bot.deleteMessage(m, {"wait": expire});
            }

        } else {
            logger.debug("Sending message to [%s], length: %s", recipient, content.length);
            m = yield bot.sendMessage(dest, content);
            if(expire && !pm) bot.deleteMessage(m, {"wait": expire});
        }

        return m;
    });

}

module.exports.send = send;
module.exports.update = update;