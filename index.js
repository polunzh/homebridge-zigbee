const SerialPort = require('serialport');

/*
var port = new SerialPort('/dev/ttyS3', {
    baudRate: 115200
});
*/

const commandHandlers = {
    '82': deivceAddressHandler
};

let deviceAddress = null;
let isSerialPortOpened = false;

const port = new SerialPort('/dev/ttyUSB0', {
    baudRate: 115200
});

port.on('open', function () {
    console.log('Serial port is opened...');
    isSerialPortOpened = true;
    // openNetwork();
    openLight();
});

port.on('data', function (data) {
    console.log('-'.repeat(10));
    data = data.toString('hex');
    console.log(`data: ${data}`);
    parseCommand(data);
    // console.log(command);
});

port.on('error', function (err) {
    console.log('error...');
    console.log(err);
});

function openNetwork(addr) {
    let command = `FE0B020102${addr}0088FF`;
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
    const addr = data.substr(10, 4);
    const mac = data.substr(22, 16);

    // 获取通道号
    getEndPoint(addr);
    // deviceAddress[addr] = { mac: mac };
    // get endpoint
    // return addr;
}

function getEndPoint(addr) {
    let command = `fe0a020302${addr}0088`;
    command += xorChecker(command);
    console.log(`command: ${command}`);
    port.write(command, (err) => {
        if (err) throw err;

        console.log('get endpoint command is send...');
    });
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
    let data = `FE0B050102${addr}${port}8801`;

    data += xorChecker(data);
    port.write(Buffer.from(data, 'hex'), (err) => {
        if (err) throw err;

        console.log('open command is send...');
    });
}