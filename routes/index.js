// dependencies
var util = require('util');
var colors = require('colors');

// debug
var debugModule = require('../modules/debughelpers');
var debug = new debugModule('maelstrom:bootstrap');
debug.setLevel(4);

// bind routes to path and bind application to port
function init(app, server, routes) {
    // landing
    app.get('/', routes.landing.bind(routes));

    // add keyword via HTTP GET
    app.get('/keyword/:input', routes.addKeyword.bind(routes));

    // route to keep free app from sleeping (heroku)
    app.get('/keepalive', routes.keepAlive.bind(routes));

    // get most popular keywords in JSON
    app.get('/popular', routes.popular.bind(routes));

    // bind to port
    server.listen(app.get('port'), function() {
        debug.log('maelstrom server listening to port '.green + app.get('port'), 'info');
    });
}

// module exports
module.exports = init;
