const inherits = require('util').inherits;
const storage = require('node-persist');
const path = require('path');
const SerialPort = require('serialport');
const _ = require('lodash');
const lib = require('./lib');
const SerialClient = require('./serialclient');

const PLATFORM_NAME = 'Osram';
const PLUGIN_NAME = 'homebridge-osram';
let PlatformAccessory, Service, Characteristic;
let deviceAddress = Object.create(null);
let isSerialPortOpened = false;

const serialClient = new SerialClient();

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
            this.api.on('didFinishLaunching', () => {
                this.log('DidFinishLaunching...');

                serialClient.on('deviceOnline', (deviceInfo) => {
                    serialClient.getEndPoint(deviceInfo.addr, (err, endpointInfo) => {
                        if (err) { this.log(err); return false };
                        const uuid = UUIDGen.generate(deviceInfo.mac);

                        //如果已存在该设备，则更新Accessory中的网络地址和终端号
                        if (this.accessories[uuid]) {
                            this.accessories[uuid].device.addr = deviceInfo.addr;
                            this.accessories[uuid].device.endpoint = endpointInfo.endpoint;

                            this.log('date device network address and endpoint updated...');
                            return false;
                        } else {
                            this.addAccessory(new Device(deviceInfo.mac, deviceInfo.addr, endpointInfo.endpoint), uuid);
                        }
                    });
                });
            });
        }
    }

    configureAccessory(accessory) {
        this.log('config accessory...');
        accessory.updateReachability(false);
        this.accessories[accessory.UUID] = accessory;
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

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, accessory.context.make)
            .setCharacteristic(Characteristic.Model, accessory.context.model)

        const service = accessory.addService(Service.Lightbulb, device.name);
        service.addCharacteristic(Characteristic.Brightness);

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
        this.addEventHandler(Service.Lightbulb, Characteristic.On);
    }

    addEventHandler(service, characteristic) {
        if (!(service instanceof Service)) {
            service = this.accessory.getService(service);
        }

        if (service === undefined) return;

        if (service.testCharacteristic(characteristic) === false) return;

        switch (characteristic) {
            case Characteristic.On:
                console.log('zhangzhenqiangfffffffffffffffffff');
                service
                    .getCharacteristic(Characteristic.On)
                    // .setValue(this.power > 0)
                    .on('get', this.getPower.bind(this))
                    .on('set', this.setPower.bind(this));
                break;
            case Characteristic.Brightness:
                service
                    .getCharacteristic(Characteristic.Brightness)
                    .setValue(this.color.brightness)
                    .setProps({ minValue: 1 })
                    .on('set', this.setBrightness.bind(this));
                break;
        }
    }

    updateReachability(device, reachable) {
        this.device = device;
        this.accessory.updateReachability(reachable);
    }

    getPower(callback) {
        serialClient.getBulbSwitchState(this.device.addr, this.device.endpoint, (err, val) => {
            if (err) return callback(err);
            callback(null, val);
        });
    }

    setPower(state, callback) {
        serialClient.switchBulb(state, this.device.addr, this.device.endpoint);
        return callback(null);
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