const SerialClient = require('./lib/serialclient.js');
const util = require('./lib/util');

console.log(util.generateCommand('FE0E050202d37a038800dd0000'));
// FE0E050202D37A038800FE000029
// FE0E050202d37a038800dd0000
/*
var port = new SerialPort('/dev/ttyS3', {
    baudRate: 115200
});
*/
// client.send('FE0B050102D37A038801', (err, res) => {
//     console.log('open');
//     console.log(err);
//     console.log('-'.repeat(20));
//     console.log(res);
// });

// client.send('FE0B050102D37A038800', (err, res) => {
//     console.log('-'.repeat(20));
//     console.log('close');
//     console.log(err);
//     console.log(res);
// });
