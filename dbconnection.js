// Here we find an appropriate database to connect to, defaulting to, localhost if we don't find one.
var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/maelstrom';

// mongoose
var mongoose = require("mongoose");
var async = require("async");
var util = require('util');

// Keyword schema
var keywordSchema = new mongoose.Schema({
    keyword: {
        type: String,
        required: true
    },
    source: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // ttl in seconds
    }
});

// Keyword model
var Keyword = mongoose.model('keyword', keywordSchema);

// Connecting to the database
var connectToDatabase = function connectToDatabase(callback){
    // Makes connection asynchronously.  Mongoose will queue up database
    // operations and release them when the connection is complete.
    mongoose.connect(uristring, { keepAlive: 1, poolSize: 1000 }, function (err, res) {
        if (err) {
            callback('ERROR connecting to mongodb database: ' + uristring + '. ' + err);
        } else {
            callback();
        }
    });
};

// close db connection (for unit testing)
var closeConnection = function closeConnection(){
    mongoose.connection.close();
};

// add a keyword to the db with TTL
var addKeywordToDatabase = function addKeywordToDatabase(keywordObject, callback){

    // create a new database entry
    var newKeywordEntry = new Keyword(keywordObject);

    // Save it to the database.
    newKeywordEntry.save(function (err, product){
        if(!err){
            callback(null, product);
        }
        else{
            callback('error saving keyword: ' + err);
        }
    });
};

// get the most popular keywords (use aggregation/grouping)
var getMostPopularKeywords = function getMostPopularKeywords(callback){
    // use the mongodb aggregate framework (pipelining) to get the most popular keywords
    Keyword.aggregate(
        {
            $project: {
                _id: 0, // leave this field out
                keyword: 1, // we want this
                source: 1 // we want this
            }
        },
        {
            $group: {
                _id: '$keyword', // grouping key - group by keyword
                total: { $sum: 1 } // sum up the results and add it to the total for each keyword
            }
        },
        {
            $project: {
                _id: 0, // leave this field out
                keyword: '$_id', // rename
                total: '$total' // keep
            }
        },
        {
            $sort : {
                total : -1 // sort descending by total count
            }
        },
        {
            $limit: 10 // limit to 10 results (top 10)
        },
        function(err, result){
        if(err){
            callback(err);
        }
        else{
            callback(null, result);
        }
    });
};

// Module exports
module.exports.addKeywordToDatabase = addKeywordToDatabase;
module.exports.getMostPopularKeywords = getMostPopularKeywords;
module.exports.connectToDatabase = connectToDatabase;
module.exports.closeConnection = closeConnection;