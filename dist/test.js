'use strict';

var OsramClient = require('./lib/osramclient');
var util = require('./lib/util');

var osramclient = new OsramClient();
// console.log(util.generateCommand('FE0E050202d37a038800dd0000'));
// console.log(util.generateCommand('FE0E050402d37a038899000200'));
setTimeout(function () {
    // osramclient.setColorTemperature(process.argv[2], 'd37a', '03');
    osramclient.setBrightness(process.argv[2], 'd37a', '03');
}, 100);