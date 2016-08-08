'use strict';

//
// escape markdown text
function escape(text) {
    return text.replace(/[-_*]/g, "\\$&");
}

module.exports.escape = escape;