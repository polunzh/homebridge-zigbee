const SerialClient = require('./serialclient');
const SIGNALTYPE = require('../config').SIGNALTYPE;
const EventEmitter = require('events');
const util = require('./util');

class OsramClient extends EventEmitter {
    constructor() {
        super();
        this.serialClient = new SerialClient();

        this.serialClient.on('deviceOnline', (data) => {
            this.emit('deviceOnline', data);
        });

        this.serialClient.on('open', (data) => {
            this.emit('open', data);
        })
    }

    getEndPoint(addr, callback) {
        let data = `FE0A020302${addr}0088`;
        this.serialClient.send(data, SIGNALTYPE.ENDPOINT, callback);
    }

    /**
     * 查询灯的开/关状态
     * 
     * @memberof SerialClient
     */
    getBulbSwitchState(addr, endpoint, callback) {
        let data = `FE0C050502${addr}${endpoint}880000`;
        this.serialClient.send(data, SIGNALTYPE.BULB_SWITCH_STATE, callback);
    }

    getBulbBrightness(addr, endpoint, callback) {
        let data = `FE0C050602${addr}${endpoint}880000`;
        this.serialClient.send(data, SIGNALTYPE.BULB_BRIGHTNESS_STATE, (err, brightness) => {
            if (err) return callback(err);

            brightness = Math.ceil((brightness / 255.0) * 100);

            return callback(null, brightness);
        });
    }

    getBulbColorTemperature(addr, endpoint, callback) {
        let data = `FE0C050802${addr}${endpoint}880700`;
        this.serialClient.send(data, SIGNALTYPE.BULB_COLORTEMPERATURE_STATE, (err, temperature) => {

        });
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
        let val = state ? '01' : '00';
        let data = `FE0B050102${addr}${endpoint}88${val}`;
        console.log('---------------------', state);
        console.log(data);

        this.serialClient.send(data, SIGNALTYPE.SWITCHBULB);
    }

    setBrightness(value, addr, endpoint) {
        value = Number(value);
        value = value > 100 ? 100 : value;
        value = value < 0 ? 0 : value;

        value = Math.ceil((value / 100.0) * 254);
        value = util.padLeft((value).toString(16), 2);

        let data = `FE0E050202${addr}${endpoint}8800${value}0000`;
        this.serialClient.send(data, null);
    }

    setColorTemperature(value, addr, endpoint) {
        value = Number(value);
        value = value > 370 ? 370 : value;
        value = value < 160 ? 160 : value;

        value = util.padLeft((value).toString(2), 16);
        const high = util.padLeft(parseInt(value.substr(0, 8), 2).toString(16), 2);
        const low = util.padLeft(parseInt(value.substr(8, 8), 2).toString(16), 2);

        let data = `fe0e050402${addr}${endpoint}88${low}${high}0000`;
        this.serialClient.send(data, null);
    }

    openNetwork(callback) {
        const data = 'FE0B02010200000088FF';
        this.serialClient.send(data, SIGNALTYPE.NETWORK_OPEN, callback);
    }
}

module.exports = OsramClient;