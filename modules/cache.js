// redis for caching
var colors = require('colors');
var redis = require('redis');
var url = require('url');

var client;
if (process.env.REDISCLOUD_URL) {
    // running on heroku with rediscloud
    var redisURL = url.parse(process.env.REDISCLOUD_URL);
    client = redis.createClient(redisURL.port, redisURL.hostname, {
        no_ready_check: true
    });
    client.auth(redisURL.auth.split(":")[1]);

} else {
    // running in local dev (localhost:6379)
    client = redis.createClient();
}

// cache override
var disableCache = false;

// request counter
var setCounter = 0;
var getCounter = 0;

// function to set cache - usage: setCache("key", "value", 3000) for ttl cache, or setCache("key", "value") for non-expiring cache.
exports.setCache = function(key, data, ttl, callback) {

    // override
    if (disableCache) {
        callback('cache disabled');
        return;
    }

    // try to stringify the data
    var input;
    try {
        input = JSON.stringify(data); // stringify input
    } catch (e) {
        callback('error on JSON.stringify: ' + e);
        return;
    }

    // set cache
    // use ['set'] when ttl<=0 is supplied, and ['setex'] when ttl>0 is supplied
    // check if cache should expire, with corresponsing ttl
    if (ttl > 0) {
        client.setex(key, ttl, input, function(err, reply) {
            if (err) {
                callback(err);
            } else if (!reply) {
                callback('redis: no reply on setex');
            } else {
                callback(null, 'redis reply on setex: ' + reply);
            }
        }); // set cache that expires
    } else {
        client.set(key, input, function(err, reply) {
            if (err) {
                callback(err);
            } else if (!reply) {
                callback('redis: no reply on set');
            } else {
                callback(null, 'redis reply on set: ' + reply);
            }
        }); // set cache that does not expire
    }
};

// function to get data from cache
exports.getCache = function(key, callback) {

    // override
    if (disableCache) {
        callback('cache disabled');
        return;
    }

    var output;
    // get data from cache with node-redis, or get data from API, then save to cache
    client.get(key, function(err, result) {
        if (err) {
            callback(err); // error message with cache miss
        } else if (!result) {
            callback('cache miss for: ' + key);
        } else {
            try {
                output = JSON.parse(result); // stringify input
            } catch (e) {
                callback('redis: error on JSON.parse: ' + e);
                return;
            }
            callback(null, output); // return parsed data when cache hit
        }
    });
};

// close connection (for unit testing)
exports.closeConnection = function() {
    client.end();
};
