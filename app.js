// dependencies
var express = require('express');
var RedisStore = require('connect-redis')(express);
var Handlers = require('./handlers');
var http = require('http');
var path = require('path');
var util = require('util');
var colors = require('colors');
var url = require('url');
var consolidate = require('consolidate');
var Handlebars = require('handlebars');
var fs = require('fs');
var db = require('./modules/dbconnection');

// app specific modules
var AppModules = {};
AppModules.Sockets = require('./modules/sockets');
AppModules.PubSub = require('./modules/pubsub');
AppModules.Routes = require('./routes');

// debug module
var debugModule = new require('./modules/debughelpers');
var debug = new debugModule('maelstrom:main');
debug.setLevel(4);

// catch all errors not listened to and print stack before killing the process
process.on('uncaughtException', function(err) {
    debug.log('Caught exception without specific handler: ' + err, 'error');
    debug.log(err.stack, 'error', 'error');
    process.exit(1);
});

// create express app
var app = express();

// secret key (for session/cookies)
var appsecret = process.env.APPSECRET || 'maelstromsecret';

// Session storage and settings (must be the same in express sessions)
var cookieParser = express.cookieParser(appsecret);

// print environment variables
debug.log(app.get('env'));
debug.log(util.inspect(process.env));

// print process arguments
process.argv.forEach(function(val, index, array) {
  console.log(index + ': ' + val);
});

// session store (in-memory for local dev, and redis for production/dev)
var sessionStore;
if(process.env.REDISCLOUD_URL){
    var redisURL = url.parse(process.env.REDISCLOUD_URL);
    // Redis session store
    sessionStore = new RedisStore({
        host: redisURL.hostname,
        port: redisURL.port,
        db: 1,
        pass: redisURL.auth.split(":")[1]
    });
}
else{
    sessionStore = new express.session.MemoryStore();
}

// all environments
app.set('port', process.env.PORT || process.argv[2] || 3000);

// template engine and layout
app.set('views', __dirname + '/views');

// Registering partials for handlebars templating
var partials = "./views/partials/";
fs.readdirSync(partials).forEach(function (file) {
    var source = fs.readFileSync(partials + file, "utf8");
    var partial = /(.+)\.html/.exec(file).pop();
    Handlebars.registerPartial(partial, source); // register partial
});

// set view engine and parsers
app.set('view engine', 'html');
app.set("view options", { layout: true });
app.engine('.html', consolidate.handlebars);
app.use(express.favicon(__dirname + '/public/favicon.ico'));

// parsing
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser);

// set session storage (redis or memory)
app.use(express.session({
  store: sessionStore,
  secret: appsecret
}));

// json pretty response
app.set('json spaces', 2);

// additional settings
app.use(express.methodOverride()); // makes it possible to override http method from client
app.use(app.router); // enable the router
app.use(express.static(path.join(__dirname, 'public'))); // serve static content from this location

// development only
if('localdev' == app.get('env')){
    app.use(express.errorHandler()); // enable the express error handler
}

// Initializing the handlers
var handlers = new Handlers();

// http and socket.io server
var server = http.createServer(app); // http
var io = require('socket.io').listen(server); // socket.io

// socket.io config
io.configure(function (){
    io.set('log level', 1); // turn off logging (too verbose..)
    io.set("polling duration", 10); // pollin interval when using xhr-polling
});

// connect to db and bootstrap application
(function bootstrap(){
    debug.log('connecting to db..'.yellow, 'info');
    db.connectToDatabase(function (err){
        if(!err){
            debug.log('connected to backend-db! - initializing maelstrom..'.green, 'info');
            /* initialize socket.io code */
            AppModules.Sockets(io);
            /* initialize remote process communication (rpc) */
            AppModules.PubSub();
            /* initialize application and bind to port */
            AppModules.Routes(app, server, handlers);
        }
        else{
            process.exit(1); // abort execution of app
        }
    });
})();
