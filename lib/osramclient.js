const SerialClient = require('./serialclient');
const SIGNALTYPE = require('./config').SIGNALTYPE;
const EventEmitter = require('events');

class OsramClient extends EventEmitter {
    constructor() {
        super();
        this.serialClient = new SerialClient();

        this.serialClient.on('deviceOnline', (data) => {
            this.emit('deviceOnline', data);
        });
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

            brightness = Math.ceil((brightness / 254 * 0.1) * 100);

            return callback(null, brightness);
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
        let val = state === 1 ? '01' : '00';
        let data = `FE0B050102${addr}${endpoint}88${val}`;

        this.serialClient.send(data, SIGNALTYPE.SWITCHBULB);
    }

    setBrightness(value, addr, endpoint) {
        value = Math.ceil((value / 100.0) * 254);
        value = (value).toString(16);
        if (value.length === 1) value = '0' + value;

        let data = `FE0E050202${addr}${endpoint}8800${value}0000`;
        this.serialClient.send(data, SIGNALTYPE.SWITCHBULB);
    }
}


module.exports = OsramClient;