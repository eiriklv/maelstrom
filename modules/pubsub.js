// dependencies
var util = require('util');
var colors = require('colors');
var ipc = require('./ipc'); // inter-process event emitter
var url = require('url');
var async = require('async');
var db = require('./dbconnection'); // mongodb backend
var redis = require('redis'); // redis

// init redis connections
var subscriber, publisher;
if ('heroku' == process.env.NODE_ENV) {
    // running on heroku with rediscloud
    var redisURL = url.parse(process.env.REDISCLOUD_URL);
    subscriber = redis.createClient(redisURL.port, redisURL.hostname, {
        no_ready_check: true
    }); // subscriber connection
    publisher = redis.createClient(redisURL.port, redisURL.hostname, {
        no_ready_check: true
    }); // publisher connection
    subscriber.auth(redisURL.auth.split(":")[1]);
    publisher.auth(redisURL.auth.split(":")[1]);
} else {
    // running in local dev (localhost:6379)
    subscriber = redis.createClient(); // subscriber connection
    publisher = redis.createClient(); // publisher connection
}

// debug
var debugModule = require('./debughelpers');
var debug = new debugModule('maelstrom:pubsub');
debug.setLevel(4);

// use redis to subscribe and publish here

function pubsub() {
    // on data, it should send the data via ipc, so that it reaches all the sockets

    // what to do when a subscription is made
    subscriber.on('subscribe', function(channel, count) {
        debug.log('subscribe'.yellow + ' channel: ' + channel.toString().blue + ' count: ' + count, 'info');
    });

    // what to do when getting any messages on a channel that has a subscription
    subscriber.on('message', function(channel, message) {
        debug.log('message'.magenta + ' channel: ' + channel + ' message: ' + util.inspect(message), 'info');

        var data;
        // try to parse the data, as it should be valid JSON. if not, something is wrong..
        try {
            data = JSON.parse(message);
        } catch (e) {
            debug.log('could not parse to JSON, aborting send - error: ' + util.inspect(e), 'error');
        }

        // if data is parsed successfully, emit data to sockets
        data ? ipc.emit('remoteAdded', data) : debug.log('data not defined - erronous input: ' + message, 'error');
    });

    // publish (stringify the data and send it via redis) (since this will only be run once, we don't need to name the callback function or remove it)
    ipc.on('localAdded', function(data) {
        debug.log('local added: ' + util.inspect(data));

        // async flow control (publish the keyword and save it to db in parallell)
        async.parallel({
                saveKeyword: function(callback) {
                    db.addKeywordToDatabase(data, function(err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback();
                        }
                    });
                },
                publishKeyword: function(callback) {
                    publisher.publish('keyword', JSON.stringify(data)); // publish to redis rpc
                    callback();
                }
            },
            function(err) {
                if (err) {
                    debug.log(err);
                } else {
                    debug.log('keyword added to db and published'.green, 'info');
                }
            });
    });

    // subscribe to redis channel
    subscriber.subscribe('keyword');
}

// module exports
module.exports = pubsub;
