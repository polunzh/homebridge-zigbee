'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var inherits = require('util').inherits;
var storage = require('node-persist');
var path = require('path');
var SerialPort = require('serialport');
var _ = require('lodash');
var util = require('./lib/util');
var OsramClient = require('./lib/osramclient');

var PLATFORM_NAME = 'Osram';
var PLUGIN_NAME = 'homebridge-osram';
var PlatformAccessory = void 0,
    Service = void 0,
    Characteristic = void 0,
    UUIDGen = void 0;
var deviceAddress = Object.create(null);
var isSerialPortOpened = false;

var osramClient = new OsramClient();

module.exports = function (homebridge) {
    console.log("homebridge API version: " + homebridge.version);

    storage.initSync({ dir: path.join(process.cwd(), '.node-persist', 'homebridge-osram') });

    PlatformAccessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, OsramPlatform, true);
};

var OsramPlatform = function () {
    function OsramPlatform(log, config, api) {
        var _this = this;

        _classCallCheck(this, OsramPlatform);

        log('Osram Platform Init');

        this.log = log;
        this.config = config;
        this.accessories = [];

        if (api) {
            this.api = api;
            this.api.on('didFinishLaunching', function () {
                _this.log('DidFinishLaunching...');

                storage.forEach(function (x) {
                    var item = storage.getItemSync(x);
                    if (_this.accessories[x] === undefined) storage.removeItem(x);else {
                        osramClient.getBulbState(item.addr, item.endpoint, function (err, state) {
                            _this.accessories[x] = new OsramAccessory(new Device(item.mac, item.addr, item.endpoint), _this.accessories[x], _this.log, state);
                        });
                    }
                });

                osramClient.on('deviceOnline', function (deviceInfo) {
                    osramClient.getEndPoint(deviceInfo.addr, function (err, endpointInfo) {
                        if (err) {
                            _this.log(err);return false;
                        };
                        var uuid = UUIDGen.generate(deviceInfo.mac);

                        // 临时存储
                        storage.setItem(uuid, {
                            mac: deviceInfo.mac,
                            addr: deviceInfo.addr,
                            endpoint: endpointInfo.endpoint
                        });

                        //如果已存在该设备，则更新Accessory中的网络地址和终端号
                        if (_this.accessories[uuid]) {
                            _this.accessories[uuid].device.addr = deviceInfo.addr;
                            _this.accessories[uuid].device.endpoint = endpointInfo.endpoint;

                            _this.log('date device network address and endpoint updated...');
                            return false;
                        } else {
                            _this.addAccessory(new Device(deviceInfo.mac, deviceInfo.addr, endpointInfo.endpoint), uuid);
                        }
                    });
                });
            });
        }
    }

    _createClass(OsramPlatform, [{
        key: 'configureAccessory',
        value: function configureAccessory(accessory) {
            this.log('config accessory...');
            accessory.updateReachability(false);
            this.accessories[accessory.UUID] = accessory;
        }
    }, {
        key: 'addAccessory',
        value: function addAccessory(device, uuid) {
            var self = this;

            osramClient.getBulbState(device.addr, device.endpoint, function (err, state) {
                if (err) return callback(err);

                var accessory = new PlatformAccessory(device.name, uuid);
                accessory.context.name = device.name;
                accessory.context.make = 'OSRAM';
                accessory.context.model = 'OSRAM';

                accessory.getService(Service.AccessoryInformation).setCharacteristic(Characteristic.Manufacturer, accessory.context.make).setCharacteristic(Characteristic.Model, accessory.context.model);

                var service = accessory.addService(Service.Lightbulb, device.name);
                service.addCharacteristic(Characteristic.Brightness);

                self.accessories[accessory.UUID] = new OsramAccessory(device, accessory, self.log, state);
                self.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
                self.log('New osram device added...');
            });
        }
    }]);

    return OsramPlatform;
}();

var OsramAccessory = function () {
    function OsramAccessory(device, accessory, log, data) {
        _classCallCheck(this, OsramAccessory);

        this.log = log;
        this.accessory = accessory;
        this.power = data.power || 0;
        this.brightness = data.brightness || 0;

        if (!(accessory instanceof PlatformAccessory)) this.log('ERROR \n', this);

        this.addEventHandlers();
        this.updateReachability(device);
    }

    _createClass(OsramAccessory, [{
        key: 'addEventHandlers',
        value: function addEventHandlers() {
            this.addEventHandler(Service.Lightbulb, Characteristic.On);
            this.addEventHandler(Service.Lightbulb, Characteristic.Brightness);
        }
    }, {
        key: 'addEventHandler',
        value: function addEventHandler(service, characteristic) {
            if (!(service instanceof Service)) {
                service = this.accessory.getService(service);
            }

            if (service === undefined) return;

            if (service.testCharacteristic(characteristic) === false) return;

            switch (characteristic) {
                case Characteristic.On:
                    service.getCharacteristic(Characteristic.On).setValue(this.power === 1).on('get', this.getPower.bind(this)).on('set', this.setPower.bind(this));
                    break;
                case Characteristic.Brightness:
                    service.getCharacteristic(Characteristic.Brightness).setValue(this.brightness).setProps({ minValue: 0, maxValue: 100 }).on('set', this.setBrightness.bind(this));
                    break;
                case Characteristic.ColorTemperature:
                    service.getCharacteristic(Characteristic.ColorTemperature).setValue(200).setProps({ minValue: 160, maxValue: 370 }).on('set', this.setColorTemperature);
            }
        }
    }, {
        key: 'updateReachability',
        value: function updateReachability(device, reachable) {
            this.device = device;
            this.accessory.updateReachability(reachable);
        }
    }, {
        key: 'getPower',
        value: function getPower(callback) {
            osramClient.getBulbSwitchState(this.device.addr, this.device.endpoint, function (err, val) {
                if (err) return callback(err);

                callback(null, val);
            });
        }
    }, {
        key: 'setPower',
        value: function setPower(state, callback) {
            osramClient.switchBulb(state, this.device.addr, this.device.endpoint);
            return callback(null);
        }
    }, {
        key: 'setBrightness',
        value: function setBrightness(value, callback) {
            osramClient.setBrightness(value, this.device.addr, this.device.endpoint);
            return callback(null);
        }
    }, {
        key: 'setColorTemperature',
        value: function setColorTemperature(value, callback) {
            return callback(null);
        }
    }]);

    return OsramAccessory;
}();

var Device = function Device(mac, addr, endpoint) {
    _classCallCheck(this, Device);

    this.mac = mac;
    this.addr = addr;
    this.endpoint = endpoint;
    this.name = 'OSRAM-' + mac;
};