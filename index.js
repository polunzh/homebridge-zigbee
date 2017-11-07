const debug = require('debug');
const inherits = require('util').inherits;
const storage = require('node-persist');
const path = require('path');
const SerialPort = require('serialport');
const _ = require('lodash');
const util = require('./lib/util');
const OsramClient = require('./lib/osramclient');

const PLATFORM_NAME = 'Zigbee';
const PLUGIN_NAME = 'homebridge-zigbee';
let PlatformAccessory, Service, Characteristic, UUIDGen;
let deviceAddress = Object.create(null);
let isSerialPortOpened = false;

let osramClient = null;
const logger = debug('homebridge-osram:index');

module.exports = function (homebridge) {
    logger("homebridge API version: " + homebridge.version);

    storage.initSync({
        dir: path.join(process.cwd(), '.node-persist', 'homebridge-osram')
    });

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
                                    new ZigbeeAccessory(new Device(item.mac, item.addr, item.endpoint),
                                        this.accessories[x],
                                        this.log,
                                        state);
                            });
                    }
                });

                osramClient.on('deviceOnline', (deviceInfo) => {
                    osramClient.getEndPoint(deviceInfo.addr, (err, endpointInfo) => {
                        console.log('--------endpoint info-------')
                        console.log(endpointInfo);
                        if (err) {
                            this.log(err);
                            return false
                        };

                        const uuid = UUIDGen.generate(deviceInfo.mac);

                        // 如果已存在该设备，则更新Accessory中的网络地址和终端号

                        if (this.accessories[uuid] === undefined && Array.isArray(deviceInfo.endpoints)) {
                            deviceInfo.endpoints.forEach((endpoint) => {
                                this.log(`add new device, addr: ${deviceInfo.addr}, endpoint: ${endpoint}`);
                                this.addAccessory(new Device(deviceInfo.mac, deviceInfo.addr, endpointInfo.endpoint), uuid);
                            });
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

        osramClient.getDeviceTypeInfo(device.addr, device.endpoint, (err, deviceType) => {
            console.log('--------------devicetype-------------');
            console.log(deviceType);

            switch (deviceType) {
                case '0009':
                    osramClient.getHADeviceInfo(device.addr, device.endpoint, (err, haInfo) => {
                        if (err) throw err;
                        osramClient.getBulbState(device.addr, device.endpoint, (err, state) => {
                            if (err) throw err;

                            const accessory = new PlatformAccessory(device.name, uuid);
                            accessory.context.name = haInfo.manuName ? haInfo.manuName + uuid : 'DEFAULT';
                            accessory.context.make = haInfo.manuName || 'DEFAULT';
                            accessory.context.model = haInfo.model || 'DEFAULT';

                            accessory.getService(Service.AccessoryInformation)
                                .setCharacteristic(Characteristic.Manufacturer, accessory.context.make)
                                .setCharacteristic(Characteristic.Model, accessory.context.model);

                            self.accessories[accessory.UUID] = new ZigbeeAccessory(device, accessory, self.log, state);
                            self.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

                            // 临时存储
                            storage.setItem(uuid, {
                                mac: device.mac,
                                addr: device.addr,
                                endpoint: device.endpoint
                            });

                            self.log(`New device is added, addr: ${device.addr}, endpoint: ${device.endpoint}...`);
                        });
                    });
                    break;
                case '0101':
                case '0102':
                    this.log('Color dimmable Light');

                    osramClient.getHADeviceInfo(device.addr, device.endpoint, (err, haInfo) => {
                        if (err) throw err;
                        osramClient.getBulbState(device.addr, device.endpoint, (err, state) => {
                            if (err) throw err;

                            const accessory = new PlatformAccessory(device.name, uuid);
                            accessory.context.name = haInfo.manuName ? haInfo.manuName + uuid : 'DEFAULT';
                            accessory.context.make = haInfo.manuName || 'DEFAULT';
                            accessory.context.model = haInfo.model || 'DEFAULT';

                            accessory.getService(Service.AccessoryInformation)
                                .setCharacteristic(Characteristic.Manufacturer, accessory.context.make)
                                .setCharacteristic(Characteristic.Model, accessory.context.model);

                            const service = accessory.addService(Service.Lightbulb, device.name);
                            service.addCharacteristic(Characteristic.Brightness);

                            const zigbeeAccessory = new ZigbeeAccessory(device, accessory, self.log, state);
                            zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.Brightness);
                            self.accessories[accessory.UUID] = zigbeeAccessory;
                            this.addEventHandler(Service.Lightbulb, Characteristic.Brightness);
                            self.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

                            // 临时存储
                            storage.setItem(uuid, {
                                mac: device.mac,
                                addr: device.addr,
                                endpoint: device.endpoint
                            });

                            self.log('New device is added...');
                        });
                    });
                    break;
                default:
                    break;
            }
        });
    }
}

class ZigbeeAccessory {
    constructor(device, accessory, log, data) {
        this.log = log;
        this.accessory = accessory;
        this.power = data.power || false;
        this.brightness = data.brightness || 0;

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
                    .setProps({
                        minValue: 0,
                        maxValue: 100
                    })
                    .on('set', this.setBrightness.bind(this));
                break;
            case Characteristic.ColorTemperature:
                service.getCharacteristic(Characteristic.ColorTemperature)
                    .setValue(200)
                    .setProps({
                        minValue: 160,
                        maxValue: 370
                    })
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