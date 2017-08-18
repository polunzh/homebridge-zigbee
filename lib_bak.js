const SerialPort = require('serialport');
const _ = require('lodash');

/*
var port = new SerialPort('/dev/ttyS3', {
    baudRate: 115200
});
*/

const commandHandlers = {
    '82': deivceAddressHandler,
    '83': endpointAddressHandler
};

let deviceAddress = Object.create(null);
let isSerialPortOpened = false;

const port = new SerialPort('COM10', {
    baudRate: 115200
});

port.on('open', function () {
    console.log('Serial port is opened...');
    isSerialPortOpened = true;
});

port.on('data', function (data) {
    data = data.toString('hex');
    // console.log(`data: ${data}`);
    parseCommand(data);
});

port.on('error', function (err) {
    console.log('error...');
    console.log(err);
});

function openNetwork(addr) {
    let command = `fe0b020102${addr}0088ff`;
    command += xorChecker(command);

    port.write(Buffer.from(command, 'hex'), (err) => {
        if (err) throw err;

        console.log('network opend...');
    });
}

function parseCommand(data) {
    const command = data.substr(6, 2);

    const handler = commandHandlers[command];
    if (typeof (handler) === 'function') {
        handler(data);
    }

    return '';
}

function deivceAddressHandler(data) {
    console.log('device handler...');
    const addr = data.substr(10, 4);
    const mac = data.substr(22, 16);

    // 获取通道号
    getEndPoint(addr);
    deviceAddress[mac] = { addr: addr };
    // get endpoint
    // return addr;
}

function endpointAddressHandler(data) {
    const addr = data.substr(10, 4);
    const endpoint = data.substr(-4, 2);

    const k = _.findKey(deviceAddress, { addr: addr });

    if (k) deviceAddress[k].endpoint = endpoint;
}

function getEndPoint(addr) {
    console.log('endpoint handler...');
    let data = `fe0a020302${addr}0088`;
    port.write(generateCommand(data), (err) => {
        if (err) throw err;

        console.log('get endpoint command is send...');
    });
}

function generateCommand(data) {
    data += xorChecker(data);
    return Buffer.from(data, 'hex');
}

function xorChecker(data) {
    if (data) {
        let sum = parseInt(data.substr(0, 2), '16');
        for (let i = 2; i < data.length; i += 2) {
            sum ^= parseInt(data.substr(i, 2), '16');
        }
        return (+sum).toString(16);
    }

    return '';
}

function openLight(macAddress, callback) {
    if (!deviceAddress || deviceAddress[macAddress]) return callback(new Error('No such a device'));
    let data = `fe0b050102${addr}${port}8801`;

    port.write(generateCommand(data), (err) => {
        if (err) throw err;

        console.log('open command is send...');
    });
}