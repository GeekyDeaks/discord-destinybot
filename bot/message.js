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
        if(content[0] && (content[0].length + msg.length > maxMessageSize)) {
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

        var pm = prevMsg.channel.type === 'dm';

        // build up the message
        if (Array.isArray(content)) {
            // replace with as much as we can
            var text = build(content);
            logger.debug("updating message to [%s/%s], length: %s", prevMsg.channel.constructor.name, pm ? prevMsg.channel.recipient.username : prevMsg.channel.name, text.length);
            m = yield prevMsg.edit(text);

            if(content.length) {
                yield _send(prevMsg.channel, content, expire);
            }
        } else {
            logger.debug("updating message to [%s/%s], length: %s", prevMsg.channel.constructor.name, pm ? prevMsg.channel.recipient.username : prevMsg.channel.name, content.length);
            m = yield prevMsg.edit(content);

        }

        if(expire && !pm) m.delete(expire);
        return m;
    });

    
}

function send(msg, content, pm = true, expire) {
    
    // check if we should respond privately
    return _send(pm ? msg.author : msg.channel, content, expire);

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
            recipient = dest.username;
        } else if(dest.type === "text") {
            pm = false;
            recipient = dest.name;
        } else {
            pm = true;
            recipient = dest.recipient.username;
        }

        // build up the message
        if (Array.isArray(content)) {
            // replace with as much as we can

            while(content.length) {
                var text = build(content);
                if(text.length) {
                    logger.debug("Sending message to [%s/%s], length: %s", dest.constructor.name, recipient , text.length);
                    m = yield dest.sendMessage(text);
                    if(expire && !pm) m.delete(expire);
                }
            }

        } else {
            
            if (content.length) {
                logger.debug("Sending message to [%s/%s], length: %s", dest.constructor.name, recipient, content.length);
                m = yield dest.sendMessage(content);
                if (expire && !pm) m.delete(expire);
            } 
        }

        return m;
    });

}

module.exports.send = send;
module.exports.update = update;