'use strict';

var logger = require('winston');
var koa = require('koa')();
var router = require('koa-router')();
var koaBody = require('koa-body')();
var hbs = require('koa-hbs');
var moment = require('moment');
var co = require('co');
var crypto = require('crypto');

var app = require.main.exports;
var bot = app.bot;
var config = app.config;
var db = app.db;

koa.use(hbs.middleware({
  viewPath: __dirname + '/views'
}));

//
// http://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number
function numberSuffix(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return "st";
    }
    if (j == 2 && k != 12) {
        return "nd";
    }
    if (j == 3 && k != 13) {
        return "rd";
    }
    return "th";
}


function getResults(candidate) {
    return co(function* (){
        var collection = db.collection(config.modules.voc.mvote.collection);

        var cast;
        var results = {
            approve: 0,
            neutral: 0,
            disapprove: 0
        };
        var cv = collection.find({ type: "vote", candidate : candidate});
        while( yield cv.hasNext() ) {
            cast = yield cv.next();
            results[cast.vote]++;
        }

        results.total = results.approve + results.neutral + results.disapprove;

        if(results.disapprove) {
            results.outcome = 'disapprove';
        } else if(!results.approve) {
            results.outcome = 'neutral';
        } else {
            results.outcome = 'approve';
        }

        return results;
    });
}


function getCandidates() {

    return co(function* () {
        var collection = db.collection(config.modules.voc.mvote.collection);

        var candidate;
        var rounds = {};
        var round;
        var cnum;
        var cc = collection.find({ type: "candidate" }).sort({ round: -1, sort: 1 });
        while (yield cc.hasNext()) {
            candidate = yield cc.next();

            if (!rounds[candidate.round]) {
                rounds[candidate.round] = {
                    round: candidate.round,
                    suffix: numberSuffix(candidate.round),
                    candidates: []
                }
                cnum = 0;
            }

            rounds[candidate.round].candidates.push({
                cnum: ++cnum,
                name: candidate.name,
                results: (yield getResults(candidate.id)),
                joined: moment(candidate.joinedAt).format("YYYY-MM-DD"),
                id: candidate.id
            });
        }

        // make an array in reverse order
        var rsend = [];
        Object.keys(rounds).sort(function (a, b) { return b - a }).forEach(function (r) {
            rsend.push(rounds[r]);
        });

        return (rsend);
    });


}

function getVoters() {
    return co(function* () {
        var collection = db.collection(config.modules.voc.mvote.collection);
        var vc = collection.find({ type: "voter" }).sort({ sort: 1 });
        var voter;
        var voters = [];
        while (yield vc.hasNext()) {
            voter = yield vc.next();
            voter.lastTokenAt = moment(voter.createdAt).format("YYYY-MM-DD HH:mm:ss")
            voters.push(voter);
        }
        return voters;

    });
}

router.get('/mvote/cast/:token', function *(next) {
    logger.info('received mvote/cast GET with token: '+this.params.token);

    var server = app.defaultServer;
    var collection = db.collection(config.modules.voc.mvote.collection);

    // make sure the token is still valid
    var voter = yield collection.findOne({type : "voter", token : this.params.token});
    if(!voter) {
        this.body = "Token expired";
        return;
    }

    var vote = yield collection.findOne({type : "details"});
    if(!vote || vote.state !== 'running') {
        this.body = "Vote not active";
        return;
    }
    
    yield this.render('cast', {
        title: vote.title,
        rounds: (yield getCandidates())
    });
});

router.post('/mvote/cast/:token', koaBody, function *(next) {
    logger.info('received mvote/cast POST with token: '+this.params.token);

    var server = app.defaultServer;
    var collection = db.collection(config.modules.voc.mvote.collection);

    // make sure the token is still valid
    var voter = yield collection.findOne({type : "voter", token : this.params.token});
    if(!voter) {
        this.body = "Token expired";
        return;
    }

    var vote = yield collection.findOne({type : "details"});
    if(!vote || vote.state !== 'running') {
        this.body = "Vote not active";
        return;
    }

    // clear the voters previous selection
    yield collection.remove({ type : "vote", voter: voter.id });

    var ids = Object.keys(this.request.body);
    var _id;
    for(var i = 0; i < ids.length; i++) {
        var vote = this.request.body[ids[i]];
        // set the vote
        _id = 'vote.'+voter.id+'.'+ids[i];
        yield collection.insert({
            _id : _id,
            type : "vote",
            voter : voter.id,
            candidate : ids[i],
            vote : vote
        });

    }

    // clear the token
    yield collection.update({ type : "voter", id : voter.id}, {$set : { token : null}, $inc : {submitted : 1}});

    this.body = 'Vote submitted';
});

router.get('/mvote/review/:token', function *(next) {
    logger.info('received mvote/review GET with token: '+this.params.token);

    var server = app.defaultServer;
    var collection = db.collection(config.modules.voc.mvote.collection);

    // make sure the token is still valid
    var review = yield collection.findOne({type : "review", token : this.params.token});
    if(!review) {
        this.body = "Token expired";
        return;
    }

    var vote = yield collection.findOne({type : "details"});
    if(!vote) {
        logger.error("mvote/cast: failed to find vote definition");
        this.body = "Vote not found";
        return;
    }

    var vsend = {
        title : vote.title,
        state: vote.state,
        createdBy : server.members.get("id", vote.createdBy).name,
        createdAt : moment(vote.createdAt).format("YYYY-MM-DD HH:mm:ss"),
        startedBy : (vote.startedBy ? server.members.get("id", vote.startedBy).name : ""),
        startedAt : (vote.startedAt ? moment(vote.startedAt).format("YYYY-MM-DD HH:mm:ss") : ""),
        endedBy : (vote.endedBy ? server.members.get("id", vote.endedBy).name : ""),
        endedAt : (vote.endedAt ? moment(vote.endedAt).format("YYYY-MM-DD HH:mm:ss") : "")
    }

    var voters = yield getVoters();
    var totalSubmitted = 0;
    var lastTokenAt = 0;
    voters.forEach(function(v) {
        if(v.submitted) totalSubmitted++;
        lastTokenAt = Math.max(lastTokenAt, v.createdAt);
    });

    yield this.render('review', {
        title: vote.title,
        vote: vsend,
        voters: voters,
        lastTokenAt: moment(lastTokenAt).format("YYYY-MM-DD HH:mm:ss"),
        idleTime: moment(lastTokenAt).fromNow(),
        totalSubmitted: totalSubmitted,
        rounds: (yield getCandidates())
    });
    
});

// -------------------------
// loadtesting routes
//

router.get('/mvote/loadtest/:token/candidates', function *(next) {
    logger.info('received mvote/loadtest//candidates GET with token: '+this.params.token);
    // make sure the token is still valid
    this.body = yield getCandidates();
});

router.get('/mvote/loadtest/:token/voters/:role', function *(next) {
    logger.info('received mvote/loadtest//voters GET with token: '+this.params.token);
    var server = app.defaultServer;
    var role = server.roles.get("name", this.params.role);
    if(!role) {
        this.body = 'role not found';
        return;
    }
    var voters = {};
    server.members.forEach(function(m) {
        if(!m.hasRole(role)) return;

        voters[m.id] = {
            id: m.id,
            name: m.name,
            sort: m.name.toUpperCase()
        };
    });
    this.body = voters;
});

router.get('/mvote/loadtest/:token/token/:id', function *(next) {

    logger.info('received mvote/loadtest//token GET with token: '+this.params.token);
    var collection = db.collection(config.modules.voc.mvote.collection);
    var server = app.defaultServer;
    var now = new Date().getTime();
    var m = server.members.get("id", this.params.id);
    var token = crypto.createHash('md5').update(m.id + "@" + now).digest('hex');
    
    // save the hash
    var _id = 'voter.' + m.id;
    yield collection.update({ _id: _id, type: "voter", "id": m.id },
        {
            $set: { token: token, createdAt: now, name: m.name, sort: m.name.toUpperCase() },
            $inc: { tokens: 1 }
        }, { upsert: true });

    this.body = token;

});

koa
  .use(router.routes())
  .use(router.allowedMethods());

koa.listen(config.modules.voc.mvote.port);
