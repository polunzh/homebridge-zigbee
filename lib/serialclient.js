const debug = require('debug');
const EventEmitter = require('events');
const SerialPort = require('serialport');
const DataHandler = require('./dataHandler');
const util = require('./util');
const config = require('../config');

const logger = debug('homebridge:serialclient');
const SIGNALTYPE = config.SIGNALTYPE;

class SerialClient extends EventEmitter {
    constructor() {
        super();

        this.queue = [];
        this.isRequest = false;
        this.handler = null;
        this.commandHandlers = {};
        this.dataHandler = new DataHandler();

        this.commandHandlers[SIGNALTYPE.DEVICE_ONLINE] = this.deviceOnline.bind(this);
        this.commandHandlers[SIGNALTYPE.HA_DEVICEINFO] = this.dataHandler.haDeviceInfoHandler.bind(this);
        this.commandHandlers[SIGNALTYPE.ENDPOINT] = this.dataHandler.endpointAddressHandler.bind(this);
        this.commandHandlers[SIGNALTYPE.BULB_SWITCH_STATE] = this.dataHandler.bulbSwitchStateHandler.bind(this);
        this.commandHandlers[SIGNALTYPE.BULB_BRIGHTNESS_STATE] = this.dataHandler.bulbBrightnessStateHandler.bind(this);
        this.commandHandlers[SIGNALTYPE.NETWORK_OPEN] = this.dataHandler.networkOpenHandler.bind(this);
        this.commandHandlers[SIGNALTYPE.NETWORK_DEVICETYPEINFO] = this.dataHandler.networkDeviceTypeInfoHandler.bind(this);
        this.commandHandlers[SIGNALTYPE.FIRMWARE] = this.dataHandler.firmwareHandler.bind(this);

        this.tempData = '';
        this.tempLength = -1;

        this.port = new SerialPort(config.SERIALPORT, {
            baudRate: 115200
        });

        this.port.on('open', () => {
            this.emit('open');
        });

        this.port.on('data', (data) => {
            data = data.toString('hex').toLowerCase();
            logger(`data received...${data}`);
            console.log(`data received...${data}`);

            if (data.startsWith('fe')) {
                this.tempLength = parseInt(data.substr(2, 2), 16) * 2;
                this.tempData = data;
                logger(this.tempLength);
                logger(this.tempData.length);
                if (this.tempLength > this.tempData.length) {
                    return;
                }
            } else {
                this.tempData += data;

                if (this.tempLength !== this.tempData.length) return;
            }

            data = this.tempData;
            this.tempData = '';
            this.tempLength = -1;
            logger(`data receive completed...${data}`);

            data = this.parseData(data);

            if (!this.checkReceiveData(data)) {
                logger('error frame: ' + data)
                return;
            }

            this.handleData(data);
        });

        this.port.on('error', (err) => {
            logger('error', err);

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
        this.queue.push({
            data,
            signalType,
            handler
        });
    }

    sendData(data) {
        logger('data to be send:' + data);
        const sendedHexData = util.generateCommand(data);
        this.port.write(sendedHexData, (err) => {
            if (err) throw err;

            logger('data sended:' + data);

            if (!this.handler) this.reset(null); // 如果没有回调函数，则继续下一个请求
            logger(`command is send... ${new Date().getTime()}`);
        });
    }

    handleData(data) {
        logger('data to be handed: ' + data);

        const command = data.substr(4, 4);

        if (command !== SIGNALTYPE.NETWORK_OPEN && command[2] === '4') return; // 如果是串口的应答帧则忽略
        if (command === SIGNALTYPE.DEVICE_ONLINE) return this.deviceOnline(data);

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
    deviceOnline(data) {
        const self = this;

        const addr = data.substr(10, 4);
        const mac = data.substr(22, 16);

        this.emit('deviceOnline', {
            addr,
            mac
        });
    }

    checkReceiveData(data) {
        if (typeof (data) !== 'string' || data.length < 1) return false;

        const frameLength = parseInt(data.substr(2, 2), 16);
        if (frameLength * 2 !== data.length) return false;

        const xor = util.xorChecker(data.substring(0, data.length - 2));
        return xor === data.substr(data.length - 2);
    }

    parseData(data) {
        // const demoframe = 'fe0b024402d9760a88009cfe1c028402d9760a21000401090000050000030004001500060000ff'
        const frameLength = parseInt(data.substr(2, 2), 16) * 2;
        if (frameLength === data.length) return data;
        else if (frameLength < data.length) {
            return data.substring(frameLength);
        } else {
            return '';
        }
    }
}

module.exports = SerialClient;