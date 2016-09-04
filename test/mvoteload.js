'use strict';

var co = require('co');
var promisify = require('promisify-node');
var request = promisify('request');

var _dest = process.argv[2];
var _token = process.argv[3];
var _candidates;
var _voters;
var _votes = {};
var _results = {};


// http://jsfromhell.com/array/shuffle
function shuffle(v){
    for(var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
    return v;
}

function getCandidates() {
    var candidates = [];

    _candidates.forEach(function (r) {
        r.candidates.forEach(function (c) {
            c.round = r.round;
            candidates.push(c);
        })
    });   

    return candidates;
}

function buildVotes() {

    var sc = shuffle(getCandidates());

    sc.forEach(function(c) {
        _results[c.id] = {
            name: c.name,
            cnum: c.cnum,
            round: c.round,
            disapprove: 0,
            neutral: 0,
            approve: 0
        }
    });

    var disapproveNum = Math.ceil(sc.length * .1);
    var approveNum = Math.ceil(sc.length * .3);

    var disapprove = sc.slice(0, disapproveNum);
    var approve = sc.slice(disapproveNum, approveNum + disapproveNum);
    var neutral = sc.slice(disapproveNum + approveNum); 

    Object.keys(_voters).forEach(function(vid) {

        // 
        _votes[vid] = {
            disapprove : [],
            neutral : [],
            approve : []
        };

        disapprove.forEach(function (c) {
            // % chance of neutral/disapprove
            if(Math.random() > .1) {
                // add a neutral voter
                _votes[vid].neutral.push(c.id);
                _results[c.id].neutral++;
            } else {
                _votes[vid].disapprove.push(c.id);
                _results[c.id].disapprove++;
            }

        });

        approve.forEach(function(c) {
            // % chance of neutral/disapprove
            if(Math.random() > .25) {
                // add a neutral voter
                _votes[vid].neutral.push(c.id);
                _results[c.id].neutral++;
            } else {
                _votes[vid].approve.push(c.id);
                _results[c.id].approve++;
            }
        });

        neutral.forEach(function (c) {
            _votes[vid].neutral.push(c.id);
            _results[c.id].neutral++;
        });

    });

}

function submitVotes() {
    return co(function* () {

        var vids = Object.keys(_votes);
        var vid;
        var token;
        var form;
        var res;
        var url = _dest+'/loadtest/'+_token;
        while(vid = vids.shift()) {

            form = {};
            // get the voting token
            res = yield request.get({ url: url+'/token/'+vid, encoding: null });
            if (res.statusCode !== 200) throw new Error(res.statusCode);
            token = res.body;

            _votes[vid].approve.forEach(function (c) {
                form[c] = 'approve';
            });
            _votes[vid].neutral.forEach(function (c) {
                form[c] = 'neutral';
            });
            _votes[vid].disapprove.forEach(function (c) {
                form[c] = 'disapprove';
            });

            // submit the voter
            console.log("submitting votes for: "+_voters[vid].name);
            res = yield request.post({ url : _dest+'/cast/'+token, form:  form });
            if (res.statusCode !== 200) throw new Error(res.statusCode);

        }


    });
}

if(!_dest || !_token) {
    console.log("no destination URL or token specified");
    process.exit();
}

co(function* (){

    var url = _dest+'/loadtest/'+_token;
    var res = yield request.get({ url: url+'/candidates', encoding: null });
    if(res.statusCode !== 200) throw new Error(res.statusCode);
    _candidates = JSON.parse(res.body);

    console.log("candidates: "+getCandidates().length);

    res = yield request.get({ url: url+'/voters/Member', encoding: null });
    if(res.statusCode !== 200) throw new Error(res.statusCode);
    _voters = JSON.parse(res.body);

    buildVotes();

    Object.keys(_results).forEach(function(r) {
        var c = _results[r];
        console.log([c.round, c.cnum, c.name, c.approve, c.neutral, c.disapprove].join(","));
    });

    //
    yield submitVotes();

});