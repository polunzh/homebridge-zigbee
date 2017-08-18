const inherits = require('util').inherits;
const storage = require('node-persist');
const path = require('path');
const SerialPort = require('serialport');
const _ = require('lodash');
const lib = require('./lib.js');

const PLATFORM_NAME = 'Osram';
const PLUGIN_NAME = 'homebridge-osram';
let PlatformAccessory, Service, Characteristic;
let deviceAddress = Object.create(null);
let isSerialPortOpened = false;

module.exports = function (homebridge) {
    console.log("homebridge API version: " + homebridge.version);

    storage.initSync({ dir: path.join(process.cwd(), '.node-persist', 'homebridge-osram') });

    PlatformAccessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, OsramPlatform, true);
};

class OsramPlatform {
    constructor(log, config, api) {
        log('Osram Platform Init');

        this.log = log;
        this.config = config;
        this.accessories = [];

        if (api) {
            this.api = api;
            this.api.on('didFinishLanuching', function () {
                this.log('DidFinishLanuching');
                this.updateDeviceInfomation();
            }.bind(this));
        }

        this.commandHandlers = {
            '82': this.deivceAddressHandler.bind(this),
            '83': this.endpointAddressHandler.bind(this)
        };

        this.port = new SerialPort('COM10', {
            baudRate: 115200
        });

        this.port.on('open', function () {
            console.log('Serial port is opened...');
            isSerialPortOpened = true;
        }.bind(this));

        this.port.on('data', function (data) {
            data = data.toString('hex');
            this.parseCommand(data);
        }.bind(this));

        this.port.on('error', function (err) {
            console.log('error...');
            console.log(err);
        }.bind(this));
    }

    configureAccessory(accessory) {
        this.log('config accessory...');
        accessory.updateReachability(false);
        console.log(accessory.UUID);
        this.accessories[accessory.UUID] = accessory;
    }

    parseCommand(data) {
        const command = data.substr(6, 2);

        const handler = this.commandHandlers[command];
        if (typeof (handler) === 'function') {
            handler(data);
        }

        return '';
    }

    // #region
    deivceAddressHandler(data) {
        const self = this;
        self.log('device handler...');

        const addr = data.substr(10, 4);
        const mac = data.substr(22, 16);

        deviceAddress[addr] = { mac };
        self.getEndPoint(addr);
    }

    endpointAddressHandler(data) {
        const self = this;
        const addr = data.substr(10, 4);
        const endpoint = data.substr(-4, 2);

        self.log('endpoint handler...');

        if (deviceAddress[addr]) {
            const uuid = UUIDGen.generate(deviceAddress[addr].mac);

            //如果已存在该设备，则更新Accessory中的网络地址和终端号
            if (self.accessories[uuid]) {
                self.accessories[uuid].device.addr = addr;
                self.accessories[uuid].device.endpoint = endpoint;

                self.log('date device network address and endpoint updated...');
                return false;
            }

            self.addAccessory(new Device(deviceAddress[addr].mac, addr, endpoint), uuid);
        }
    }
    // #region

    getEndPoint(addr) {
        console.log('get endpoint...');
        let data = `fe0a020302${addr}0088`;
        this.port.write(lib.generateCommand(data), (err) => {
            if (err) throw err;

            console.log('get endpoint command is send...');
        });
    }

    openLight(macAddress, callback) {
        const self = this;

        if (!deviceAddress || deviceAddress[macAddress]) return callback(new Error('No such a device'));
        let data = `fe0b050102${addr}${port}8801`;

        self.port.write(lib.generateCommand(data), (err) => {
            if (err) throw err;

            console.log('open command is send...');
        });
    }

    addAccessory(device, uuid) {
        const self = this;
        const accessory = new PlatformAccessory(device.name, uuid);

        accessory.context.name = device.name;
        accessory.context.make = 'OSRAM';
        accessory.context.model = 'OSRAM';

        self.accessories[accessory.UUID] = new OsramAccessory(device, accessory, self.log);
        self.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
        self.log('new osram device added...');
    }
}

class OsramAccessory {
    constructor(device, accessory, log) {
        this.log = log;
        this.accessory = accessory;

        if (!(accessory instanceof PlatformAccessory)) this.log('ERROR \n', this);


        this.addEventHandlers();
        this.updateReachability(device);
    }

    addEventHandlers() {

    }

    addEventHandler(service, characteristic) {
    }

    updateReachability(device, reachable) {
        this.device = device;
        this.accessory.updateReachability(reachable);
    }
}

class Device {
    constructor(mac, addr, endpoint) {
        this.mac = mac;
        this.addr = addr;
        this.endpoint = endpoint;
        this.name = `OSRAM-${mac}`;
    }
}