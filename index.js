const debug = require('debug');
const inherits = require('util').inherits;
const storage = require('node-persist');
const path = require('path');
const SerialPort = require('serialport');
const _ = require('lodash');
const util = require('./lib/util');
const ZigbeeClient = require('./lib/zigbeeClient');

const PLATFORM_NAME = 'Zigbee';
const PLUGIN_NAME = 'homebridge-zigbee';
let PlatformAccessory, Service, Characteristic, UUIDGen;
let deviceAddress = Object.create(null);
let isSerialPortOpened = false;

let zigbeeClient = null;
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

    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, ZigbeePlatform, true);
};

class ZigbeePlatform {
    constructor(log, config, api) {
        log('Osram Platform Init');
        const self = this;

        this.log = log;
        this.config = config;
        this.accessories = [];

        if (api) {
            this.api = api;
            this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
        }

        this.eventHandlers = {
            '0009': function mainsPowerHandler(zigbeeAccessory) {
                zigbeeAccessory.addEventHandler(Service.Outlet, Characteristic.On);
            },
            '0101': function dimmableLightHandler(zigbeeAccessory) {
                zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.On);
                zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.Brightness);
            },
            '0102': function colorDimmableLightHandler(zigbeeAccessory) {
                zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.On);
                zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.Brightness);
            }
        };

        this.deviceTypeHandlers = {
            '0009': function mainsPowerHandler(device, accessory, log) {
                const service = accessory.addService(Service.Outlet, accessory.context.name);

                const zigbeeAccessory = new ZigbeeAccessory(device, accessory, log, device.state);
                self.eventHandlers['0009'](zigbeeAccessory);

                return zigbeeAccessory;
            },
            '0101': function dimmableLightHandler(device, accessory, log) {
                const service = accessory.addService(Service.Lightbulb, accessory.context.name);
                service.addCharacteristic(Characteristic.Brightness);

                const zigbeeAccessory = new ZigbeeAccessory(device, accessory, log, device.state);
                self.eventHandlers['0101'](zigbeeAccessory);

                return zigbeeAccessory;
            },
            '0102': function colorDimmableLightHandler(device, accessory, log) {
                const service = accessory.addService(Service.Lightbulb, accessory.context.name);
                service.addCharacteristic(Characteristic.Brightness);

                const zigbeeAccessory = new ZigbeeAccessory(device, accessory, log, device.state);
                self.eventHandlers['0102'](zigbeeAccessory);

                return zigbeeAccessory;
            }
        };
    }

    didFinishLaunching() {
        const self = this;
        this.log('DidFinishLaunching...');
        zigbeeClient = new ZigbeeClient()
        zigbeeClient.on('open', () => {
            this.log('Serial port is opened...');
            zigbeeClient.openNetwork((err, state) => {
                this.log('Network is opened...');
                storage.forEach((x) => {
                    let item = storage.getItemSync(x);
                    if (this.accessories[x] === undefined) storage.removeItem(x);
                    else {
                        zigbeeClient.getBulbState(
                            item.addr,
                            item.endpoint,
                            (err, state) => {
                                self.accessories[x] =
                                    new ZigbeeAccessory(new Device(item.mac, item.addr, item.endpoint),
                                        this.accessories[x],
                                        this.log,
                                        state);
                                self.eventHandlers[self.accessories[x].context.deviceType](self.accessories[x]);
                            });
                    }
                });

                zigbeeClient.on('deviceOnline', (deviceInfo) => {
                    zigbeeClient.getEndPoint(deviceInfo.addr, (err, endpointInfo) => {
                        if (err) {
                            this.log(err);
                            return false
                        };

                        console.log('--------endpoint info-------');
                        console.log(endpointInfo);

                        endpointInfo.endpoints.forEach((endpoint) => {
                            const uuid = UUIDGen.generate(deviceInfo.mac + endpoint);
                            // 如果已存在该设备，则更新Accessory中的网络地址和终端号
                            if (this.accessories[uuid] === undefined) {
                                this.log(`add new device, addr: ${deviceInfo.addr}, endpoint: ${endpoint}`);
                                this.addAccessory(new Device(deviceInfo.mac, deviceInfo.addr, endpoint), uuid);
                            }
                        });
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

        zigbeeClient.getDeviceTypeInfo(device.addr, device.endpoint, (err, deviceType) => {
            this.log(`--------------devicetype: ${deviceType}-------------`);

            this.getDeviceInfo(device.addr, device.endpoint, (err, deviceInfo) => {
                if (err) throw err;

                const handler = self.deviceTypeHandlers[deviceType];
                if (handler) {
                    const accessory = this.generateAccessory(deviceInfo.manuName, deviceInfo.model, uuid);
                    accessory.context.deviceType = deviceType;

                    device.state = deviceInfo.state;
                    const zigbeeAccessory = handler(device, accessory, Service, self.log)
                    self.accessories[accessory.UUID] = zigbeeAccessory;
                    self.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

                    // 临时存储
                    storage.setItem(uuid, {
                        mac: device.mac,
                        addr: device.addr,
                        endpoint: device.endpoint
                    });

                    self.log(`New device is added, addr: ${device.addr}, endpoint: ${device.endpoint}...`);
                }
            });
        });
    }

    getDeviceInfo(addr, endpoint, callback) {
        zigbeeClient.getHADeviceInfo(addr, endpoint, (err, haInfo) => {
            if (err) return callback(err);

            zigbeeClient.getBulbState(addr, endpoint, (err, state) => {
                if (err) return callback(err);

                return callback(null, {
                    manuName: haInfo.manuName,
                    model: haInfo.model,
                    state
                });
            });
        });
    }

    generateAccessory(manuName, model, uuid) {
        manuName = manuName ? manuName.trim() : 'DEFAULT';
        model = model ? model.trim() : 'DEFAULT';

        const deviceName = `${manuName}_${uuid}`;
        const accessory = new PlatformAccessory(deviceName, uuid);

        accessory.context.name = deviceName;
        accessory.context.make = manuName;
        accessory.context.model = model || 'DEFAULT';

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, accessory.context.make)
            .setCharacteristic(Characteristic.Model, accessory.context.model);

        return accessory;
    }
}

class Device {
    constructor(mac, addr, endpoint) {
        this.mac = mac;
        this.addr = addr;
        this.endpoint = endpoint;
    }
}

class ZigbeeAccessory {
    constructor(device, accessory, log, data) {
        this.log = log;
        this.context = accessory.context;
        this.accessory = accessory;
        this.power = data.power || false;
        this.brightness = data.brightness || 0;

        // if (!(accessory instanceof PlatformAccessory)) this.log('ERROR \n', this);

        this.addEventHandlers();
        this.updateReachability(device);
    }

    addEventHandlers() {}

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
        zigbeeClient.getBulbSwitchState(this.device.addr, this.device.endpoint, (err, val) => {
            if (err) return callback(err);

            callback(null, val);
        });
    }

    setPower(state, callback) {
        zigbeeClient.switchBulb(state, this.device.addr, this.device.endpoint);
        return callback(null);
    }

    setBrightness(value, callback) {
        zigbeeClient.setBrightness(value, this.device.addr, this.device.endpoint);
        return callback(null);
    }

    setColorTemperature(value, callback) {
        return callback(null);
    }
}