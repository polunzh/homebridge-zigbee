const EventEmitter = require('events');
const SerialPort = require('serialport');
const DataHandler = require('./lib/DataHandler');
const lib = require('./lib.js');

const SIGNALTYPE = {
    DEVICE_ONLINE: '82',
    ENDPOINT: '83',
    BULB_SWITCH_STATE: '85',
    BULB_BRIGHTNESS_STATE: '86'
};

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

        this.port = new SerialPort('COM10', {
            baudRate: 115200
        });

        this.port.on('open', function () {
            console.log('Serial port is opened...');
        });

        this.port.on('data', (data) => {
            data = data.toString('hex');
            this.handleData(data);
        });

        this.port.on('error', (err) => {
            console.log('error...');
            console.log(err);

            this.reset(err);
        });

        setInterval(() => {
            if (!this.isRequest && this.queue.length > 0) {
                let item = this.queue.shift();
                this.handler = item.handler;
                this.signalType = item.signalType;

                this.sendData(item.data);
            }
        }, 500);
    }

    reset(err, data) {
        if (err && typeof (this.handler) === 'function') {
            this.handler(err, data);
        }

        this.handler = null;
        this.signalType = null;
        this.isRequest = false;
    }

    send(data, signalType, handler) {
        this.queue.push({ data, signalType, handler });
    }

    sendData(data) {
        this.port.write(lib.generateCommand(data), (err) => {
            if (err) throw err;

            console.log('command is send...');
        });
    }

    handleData(data) {
        const command = data.substr(6, 2);

        if (command.startsWith('4')) return; // 如果是串口的应答帧则忽略

        if (command === SIGNALTYPE.DEVICE_ONLINE) return this.deivceOnline(data);

        if (typeof (this.handler) === 'function' && command === this.signalType &&
            typeof (this.commandHandlers[this.signalType]) === 'function') {

            this.commandHandlers[this.signalType](data, this.handler);
        }

        this.reset(null, data);
    }

    // #region 控制接口
    getEndPoint(addr, callback) {
        let data = `FE0A020302${addr}0088`;
        this.send(data, SIGNALTYPE.ENDPOINT, callback);
    }

    /**
     * 查询灯的开/关状态
     * 
     * @memberof SerialClient
     */
    getBulbSwitchState(addr, endpoint, callback) {
        let data = `FE0C050502${addr}${endpoint}880000`;
        this.send(data, SIGNALTYPE.BULB_SWITCH_STATE, callback);
    }

    getBulbBrightness(addr, endpoint, callback) {
        let data = `FE0C050602${addr}${endpoint}880000`;
        this.send(data, SIGNALTYPE.BULB_BRIGHTNESS_STATE, callback);
    }

    getBulbState(addr, endpoint, callback) {
        this.getBulbSwitchState(addr, endpoint, (err, state) => {
            if (err) return callback(err);

            this.getBulbBrightness(addr, endpoint, (err, brightness) => {
                return callback(null, { power: state, brightness: brightness });
            });
        });
    }

    switchBulb(state, addr, endpoint) {
        let val = state === 1 ? '01' : '00';
        let data = `FE0B050102${addr}${endpoint}88${val}`;

        this.send(data, SIGNALTYPE.SWITCHBULB);
    }

    setBrightness(value, addr, endpoint) {
        value = (value).toString(16);
        if (value.length === 1) value = '0' + value;

        let data = `FE0E050202${addr}${endpoint}8800${value}0000`;
        this.send(data, SIGNALTYPE.SWITCHBULB);
    }

    // end region
    deivceOnline(data) {
        const self = this;

        const addr = data.substr(10, 4);
        const mac = data.substr(22, 16);

        this.emit('deviceOnline', { addr, mac });
    }
}

module.exports = SerialClient;