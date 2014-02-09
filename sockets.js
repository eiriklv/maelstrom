// dependencies
var util = require('util');
var colors = require('colors');
var ipc = require('./ipc');
var async = require('async');
var db = require('./dbconnection');

// debug
var debugModule = require('./debughelpers');
var debug = new debugModule('maelstrom:sockets');
debug.setLevel(4);

// handle socket io
function sockets(io){
    // do something with socket.io here
    io.sockets.on('connection', function (socket) {
        debug.log('user connected via socket.io'.yellow, 'info');

        // broadcast the input to all sockets connected
        function broadcastInput(data){
            socket.emit('keywordAdded', data);
        }

        // bind to event. when receiving messages from ipc, broadcast to sockets
        ipc.on('remoteAdded', broadcastInput);

        // handle input from browser
        socket.on('input', function(data){
            debug.log('got input from browser'.magenta, 'info');
            ipc.emit('localAdded', data); // send to pubsub processing
        });

        // remove listener from event to prevent errors and memory leaks
        socket.on('disconnect', function () {
            debug.log('user disconnected from socket.io'.grey, 'info');
            ipc.removeListener('remoteAdded', broadcastInput);
        });
    });
}

// module exports
module.exports = sockets;