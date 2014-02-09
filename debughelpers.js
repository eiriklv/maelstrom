//////////////////////////////////////////
/////// CUSTOM DEBUGGING MODULE //////////
//////////////////////////////////////////

// dependencies
var colors = require('colors');
var util = require('util');

// theme for different situations
colors.setTheme({
    info: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

// available colors from which to alternate
colorArray = [
    'yellow',
    'magenta',
    'green',
    'red',
    'grey',
    'blue'
];

// global counter to cycle colors
var colorCount = 0;

// debug logging class
function debugFunctions(owner){
    // cycle through the color array
    var colorNumber = colorCount%(colorArray.length);
    var colorChoice = colorArray[colorNumber];
    colorCount++;

    // level of logging
    var maxLogLevel = 4;
    // logging enabled/disabled
    var debugOn = true;

    // function to set logging level
    this.setLevel = function setLevel(level){
        maxLogLevel = level;
    };

    // function to enabled/disable logging
    this.enabled = function enabled(input){
        debugOn = input;
    };

    // main logging function
    this.log = function log(data, type){
        var prefix;
        var level = 0; // default

        // determine the type of message / importance
        switch(type)
        {
        case 'error':
            prefix = '***Error***'.error;
            level = 1;
            break;
        case 'warn':
            prefix = '***Warning***'.warn;
            level = 2;
            break;
        case 'info':
            prefix = '---Info---'.info;
            level = 3;
            break;
        default:
            prefix = '---Debug---'.debug;
            level = 4;
        }

        // log the message based on level and/or if debugging is enabled
        if(debugOn && level<=maxLogLevel){
            console.log(owner[colorChoice].bold + ' | ' + prefix + ' | ' + data);
        }
    };
}

module.exports = debugFunctions;