const EventEmitter = require('events');
const SerialPort = require('serialport');
const DataHandler = require('./dataHandler');
const util = require('./util');
const config = require('./config');

const SIGNALTYPE = require('./config').SIGNALTYPE;

class SerialClient extends EventEmitter {
    constructor() {
        super();

        this.queue = [];
        this.isRequest = false;
        this.handler = null;
        this.commandHandlers = {};
        this.dataHandler = new DataHandler();

        this.commandHandlers[SIGNALTYPE.DEVICE_ONLINE] = this.deivceOnline.bind(this);
        this.commandHandlers[SIGNALTYPE.ENDPOINT] = this.dataHandler.endpointAddressHandler.bind(this);
        this.commandHandlers[SIGNALTYPE.BULB_SWITCH_STATE] = this.dataHandler.bulbSwitchStateHandler.bind(this);
        this.commandHandlers[SIGNALTYPE.BULB_BRIGHTNESS_STATE] = this.dataHandler.bulbBrightnessStateHandler.bind(this);

        this.port = new SerialPort(config.SERIALPORT, {
            baudRate: 115200
        });

        this.port.on('open', function () {
            console.log('Serial port is opened...');
        });

        this.port.on('data', (data) => {
            data = data.toString('hex');

            // console.log(`data received...${data}`);

            if (!this.checkReceiveData(data)) return; // 如果

            this.handleData(data);
        });

        this.port.on('error', (err) => {
            console.log('error...');
            console.log(err);

            this.reset(err);
        });

        setInterval(() => {
            if (!this.isRequest && this.queue.length > 0) {
                this.isRequest = true;
                // 最多重试两次
                if (this.queue[0].count >= 2) {
                    this.queue.shift();
                    return;
                }

                this.queue[0].count = this.queue[0].count ? this.queue[0].count + 1 : 1;

                let item = this.queue[0];
                this.handler = item.handler;
                this.signalType = item.signalType;

                this.sendData(item.data);
            }
        }, 150);
    }

    reset(err, data) {
        if (err && typeof (this.handler) === 'function') {
            this.handler(err, data);
        }

        this.queue.shift();
        this.handler = null;
        this.signalType = null;
        this.isRequest = false;
    }

    send(data, signalType, handler) {
        this.queue.push({ data, signalType, handler });
    }

    sendData(data) {
        console.log(util.generateCommand(data));
        this.port.write(util.generateCommand(data), (err) => {
            if (err) throw err;

            if (this.handler === null) reset(null); // 如果没有回调函数，则继续下一个请求
            // console.log(data);
            // console.log(`${data.substr(6, 2)} command is send...`);
        });
    }

    handleData(data) {

        const command = data.substr(6, 2);

        if (command.startsWith('4')) return; // 如果是串口的应答帧则忽略

        if (command === SIGNALTYPE.DEVICE_ONLINE) return this.deivceOnline(data);

        // 如果没有回调函数则重置，开始下一个请求
        if (this.handler === null) {
            this.reset();
            return;
        }

        if (typeof (this.handler) === 'function' && command === this.signalType &&
            typeof (this.commandHandlers[this.signalType]) === 'function') {

            this.commandHandlers[this.signalType](data, this.handler);
        }

        this.reset(null, data);
    }

    // end region
    deivceOnline(data) {
        const self = this;

        const addr = data.substr(10, 4);
        const mac = data.substr(22, 16);

        this.emit('deviceOnline', { addr, mac });
    }

    checkReceiveData(data) {
        const frameLength = parseInt(data.substr(2, 2), 16);
        if (frameLength * 2 !== data.length) return false;

        const xor = util.xorChecker(data.substring(0, data.length - 2));
        return xor === data.substr(data.length - 2);
    }
}

module.exports = SerialClient;