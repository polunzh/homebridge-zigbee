const SerialClient = require('./serialclient.js');

/*
var port = new SerialPort('/dev/ttyS3', {
    baudRate: 115200
});
*/
const client = new SerialClient({ log: (msg) => console.log(msg) });
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

client.getBulbSwitchState('d37a', '03', (a, b) => {
    console.log(a);
    console.log(b);
});