const debug = require('debug');
const inherits = require('util').inherits;
const storage = require('node-persist');
const path = require('path');
const SerialPort = require('serialport');
const _ = require('lodash');
const util = require('./lib/util');
const OsramClient = require('./lib/osramclient');

const PLATFORM_NAME = 'Osram';
const PLUGIN_NAME = 'homebridge-osram';
let PlatformAccessory, Service, Characteristic, UUIDGen;
let deviceAddress = Object.create(null);
let isSerialPortOpened = false;

let osramClient = null;
const logger = debug('homebridge-osram:index');

module.exports = function (homebridge) {
    logger("homebridge API version: " + homebridge.version);

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
            this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
        }
    }

    didFinishLaunching() {
        this.log('DidFinishLaunching...');
        osramClient = new OsramClient()
        osramClient.on('open', () => {
            this.log('Serial port is opened...');
            osramClient.openNetwork((err, state) => {
                this.log('Network is opened...');
                storage.forEach((x) => {
                    let item = storage.getItemSync(x);
                    if (this.accessories[x] === undefined) storage.removeItem(x);
                    else {
                        osramClient.getBulbState(
                            item.addr,
                            item.endpoint,
                            (err, state) => {
                                this.accessories[x] =
                                    new OsramAccessory(new Device(item.mac, item.addr, item.endpoint),
                                        this.accessories[x],
                                        this.log,
                                        state);
                            });
                    }
                });

                osramClient.on('deviceOnline', (deviceInfo) => {
                    osramClient.getEndPoint(deviceInfo.addr, (err, endpointInfo) => {
                        if (err) { this.log(err); return false };
                        const uuid = UUIDGen.generate(deviceInfo.mac);

                        // 临时存储
                        storage.setItem(uuid, {
                            mac: deviceInfo.mac,
                            addr: deviceInfo.addr,
                            endpoint: endpointInfo.endpoint
                        });

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

        });

    }

    configureAccessory(accessory) {
        this.log('config accessory...');
        accessory.updateReachability(false);
        this.accessories[accessory.UUID] = accessory;
    }

    addAccessory(device, uuid) {
        const self = this;

        osramClient.getBulbState(device.addr, device.endpoint, (err, state) => {
            if (err) return callback(err);

            const accessory = new PlatformAccessory(device.name, uuid);
            accessory.context.name = device.name;
            accessory.context.make = 'OSRAM';
            accessory.context.model = 'OSRAM';

            accessory.getService(Service.AccessoryInformation)
                .setCharacteristic(Characteristic.Manufacturer, accessory.context.make)
                .setCharacteristic(Characteristic.Model, accessory.context.model);

            const service = accessory.addService(Service.Lightbulb, device.name);
            service.addCharacteristic(Characteristic.Brightness);

            self.accessories[accessory.UUID] = new OsramAccessory(device, accessory, self.log, state);
            self.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
            self.log('New osram device added...');
        });
    }
}

class OsramAccessory {
    constructor(device, accessory, log, data) {
        this.log = log;
        this.accessory = accessory;
        this.power = data.power || 0;
        this.brightness = data.brightness || 0;

        if (!(accessory instanceof PlatformAccessory)) this.log('ERROR \n', this);

        this.addEventHandlers();
        this.updateReachability(device);
    }

    addEventHandlers() {
        this.addEventHandler(Service.Lightbulb, Characteristic.On);
        this.addEventHandler(Service.Lightbulb, Characteristic.Brightness);
    }

    addEventHandler(service, characteristic) {
        if (!(service instanceof Service)) {
            service = this.accessory.getService(service);
        }

        if (service === undefined) return;

        if (service.testCharacteristic(characteristic) === false) return;

        switch (characteristic) {
            case Characteristic.On:
                service
                    .getCharacteristic(Characteristic.On)
                    .setValue(this.power === 1)
                    .on('get', this.getPower.bind(this))
                    .on('set', this.setPower.bind(this));
                break;
            case Characteristic.Brightness:
                service
                    .getCharacteristic(Characteristic.Brightness)
                    .setValue(this.brightness)
                    .setProps({ minValue: 0, maxValue: 100 })
                    .on('set', this.setBrightness.bind(this));
                break;
            case Characteristic.ColorTemperature:
                service.getCharacteristic(Characteristic.ColorTemperature)
                    .setValue(200)
                    .setProps({ minValue: 160, maxValue: 370 })
                    .on('set', this.setColorTemperature);
        }
    }

    updateReachability(device, reachable) {
        this.device = device;
        this.accessory.updateReachability(reachable);
    }

    getPower(callback) {
        osramClient.getBulbSwitchState(this.device.addr, this.device.endpoint, (err, val) => {
            if (err) return callback(err);

            callback(null, val);
        });
    }

    setPower(state, callback) {
        osramClient.switchBulb(state, this.device.addr, this.device.endpoint);
        return callback(null);
    }

    setBrightness(value, callback) {
        osramClient.setBrightness(value, this.device.addr, this.device.endpoint);
        return callback(null);
    }

    setColorTemperature(value, callback) {
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