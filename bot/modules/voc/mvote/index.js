'use strict';

var logger = require('winston');
var koa = require('koa')();
var router = require('koa-router')();
var koaBody = require('koa-body')();
var hbs = require('koa-hbs');
var moment = require('moment');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

koa.use(hbs.middleware({
  viewPath: __dirname + '/views'
}));


router.get('/mvote/:token', function *(next) {
    logger.info('received mvote GET with token: '+this.params.token);

    var server = app.defaultServer;
    var collection = db.collection(config.modules.voc.mvote.collection);

    // make sure the token is still valid
    var voter = yield collection.findOne({type : "voter", token : this.params.token});
    if(!voter) {
        this.body = "Token expired";
        return;
    }

    var candidate;
    var candidates = [];
    var member;
    var cc = collection.find({ type: "candidate" }).sort("joinedAt");
    while (yield cc.hasNext()) {
        candidate = yield cc.next();
        // lookup the candidate name
        member = server.members.get("id", candidate.discord);
        if(!member) {
            logger.error("mvote: failed to resolved discord ID: "+candidate.discord);
            continue;
        }
        candidates.push({ 
            name: member.username,
            joined: moment(member.joinedAt).format("YYYY-MM-DD"), 
            id: member.id 
        });
    }

    yield this.render('mvote', {
        server: server.name,
        token: this.params.token,
        candidates: candidates
    });
});

router.post('/mvote/:token', koaBody, function *(next) {
    logger.info('received mvote POST with token: '+this.params.token);

    var server = app.defaultServer;
    var collection = db.collection(config.modules.voc.mvote.collection);

    // make sure the token is still valid
    var voter = yield collection.findOne({type : "voter", token : this.params.token});
    if(!voter) {
        this.body = "Token expired";
        return;
    }
    // clear the voters previous selection
    yield collection.remove({ type : "vote", voter : voter.discord });

    var ids = Object.keys(this.request.body);
    for(var i = 0; i < ids.length; i++) {
        var vote = this.request.body[ids[i]];
        // set the vote
        yield collection.insert({
            type : "vote",
            voter : voter.discord,
            candidate : ids[i],
            vote : vote
        });

    }

    // clear the token
    yield collection.update({ type : "voter", discord : voter.discord}, {$set : { token : null, submitted : true}});

    this.body = 'Vote submitted';
});

koa
  .use(router.routes())
  .use(router.allowedMethods());

koa.listen(3000);
