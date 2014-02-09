// modules
var db = require('./dbconnection'); // backend-db module
var cache = require('./routes/cache'); // internal cache module

// test helper object
var keywordObject = { keyword: 'testkeyword', source: 'test' };
var popularObject = { total: '10', keyword: 'testkeyword' };
var cacheKey = 'unit-test-123456';

// tests
module.exports = {
    'connect to database': function(test){
        test.expect(1);

        var connected = false;

        // connect to db
        db.connectToDatabase(function(err){
            if(!err){
                connected = true;
            }
            test.ok(connected, 'establish connection to mongodb');
            test.done();
        });
    },
    'add keyword to database': function(test){
        test.expect(1);
        var error = false;

        // add keyword to db
        db.addKeywordToDatabase(keywordObject, function(err, result){
            if(err){
                test.ok(!err, 'db error on adding keyword');
            }
            else{
                test.equals(result.keyword, keywordObject.keyword);
            }
            test.done();
        });
    },
    'get popular keywords from database': function(test){
        test.expect(3);

        var dbError = false;
        var dbResult;
        var resultLength = 0;

        db.getMostPopularKeywords(function(err, result){
            if(err){
                dbError = true;
            }
            else{
                dbResult = result;
                resultLength = result.length;
            }

            test.ok(!dbError, 'database error on getting popular keywords');
            test.ok(resultLength>0, 'db should contain at least the keyword added by previous test');
            test.ok(equals(Object.keys(result[0]),Object.keys(popularObject)), 'results from db should have the properties "keyword" and "total"');
            test.done();
            db.closeConnection();
        });
    },
    'add cache entry with 5 second ttl': function(test){
        test.expect(2);

        var error = false;
        var cacheReply = '';

        // set cache with 5 second ttl
        cache.setCache(cacheKey, keywordObject, 5, function(err, reply){
            if(err){
                error = true;
            }
            else{
                cacheReply = reply;
            }
            test.ok(!error, 'error on cache set');
            test.equals(cacheReply, 'redis reply on setex: OK');
            test.done();
        });
    },
    'get cache entry when cache exists (after 2 seconds)': function(test){
        test.expect(2);

        var error = false;
        var cacheResult = {};

        // check if the cache exists after 2 seconds
        setTimeout(function(){
            cache.getCache(cacheKey, function(err, result){
                if(err){
                    error = true;
                }
                else{
                    cacheResult = result;
                }
                test.ok(!error, 'error on cache get');
                test.ok(equals(cacheResult, keywordObject), 'result should be equal to what was cached');
                test.done();
            });
        }, 2000);
    },
    'get cache miss when cache entry is expired (after 7 seconds)': function(test){
        test.expect(1);

        var error = '';

        // check if the cache exists after 7 seconds
        setTimeout(function(){
            cache.getCache(cacheKey, function(err, result){
                if(err){
                    error = err;
                }
                test.equals(error, 'cache miss for: '+cacheKey, 'cache should be expired');
                test.done();
                cache.closeConnection();
            });
        }, 7000);
    }
};

///////////////////////
/////// Helpers ///////
///////////////////////

// async test helper - use this instead of test.expect() and test.done() in tests with multiple test calls where one or more is async
function asyncTest(test, total){
    return new asyncTestCheck(test, total);

    // return this
    function asyncTestCheck(test, total){
        test.expect(total);
        this.count = 0;

        // check if the tests are done
        this.done = function(){
            this.count++;
            if(this.count == total){
                test.done();
            }
        };
    }
}

// function to compare two objects x and y
function equals(x,y){
    var p;
    for(p in y) {
        if(typeof(y[p])=='undefined') {return false;}
    }

    for(p in y) {
        if (y[p]) {
            switch(typeof(y[p])) {
                case 'object':
                    if(!y[p].equals(x[p])) { return false; } break;
                case 'function':
                    if(typeof(x[p])=='undefined' ||
                        (p != 'equals' && y[p].toString() != x[p].toString()))
                        return false;
                    break;
                default:
                    if(y[p] != x[p]) { return false; }
            }
        } else {
            if (x[p])
                return false;
        }
    }

    for(p in x) {
        if(typeof(y[p])=='undefined') {return false;}
    }

    return true;
}