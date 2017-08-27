'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');
var SerialPort = require('serialport');
var DataHandler = require('./dataHandler');
var util = require('./util');
var config = require('./config');

var SIGNALTYPE = require('./config').SIGNALTYPE;

var SerialClient = function (_EventEmitter) {
    _inherits(SerialClient, _EventEmitter);

    function SerialClient() {
        _classCallCheck(this, SerialClient);

        var _this = _possibleConstructorReturn(this, (SerialClient.__proto__ || Object.getPrototypeOf(SerialClient)).call(this));

        _this.queue = [];
        _this.isRequest = false;
        _this.handler = null;
        _this.commandHandlers = {};
        _this.dataHandler = new DataHandler();

        _this.commandHandlers[SIGNALTYPE.DEVICE_ONLINE] = _this.deivceOnline.bind(_this);
        _this.commandHandlers[SIGNALTYPE.ENDPOINT] = _this.dataHandler.endpointAddressHandler.bind(_this);
        _this.commandHandlers[SIGNALTYPE.BULB_SWITCH_STATE] = _this.dataHandler.bulbSwitchStateHandler.bind(_this);
        _this.commandHandlers[SIGNALTYPE.BULB_BRIGHTNESS_STATE] = _this.dataHandler.bulbBrightnessStateHandler.bind(_this);

        _this.port = new SerialPort(config.SERIALPORT, {
            baudRate: 115200
        });

        _this.port.on('open', function () {
            console.log('Serial port is opened...');
        });

        _this.port.on('data', function (data) {
            data = data.toString('hex');

            // console.log(`data received...${data}`);

            if (!_this.checkReceiveData(data)) return; // 如果

            _this.handleData(data);
        });

        _this.port.on('error', function (err) {
            console.log('error...');
            console.log(err);

            _this.reset(err);
        });

        setInterval(function () {
            if (!_this.isRequest && _this.queue.length > 0) {
                _this.isRequest = true;
                // 最多重试两次
                if (_this.queue[0].count >= 2) {
                    _this.queue.shift();
                    return;
                }

                _this.queue[0].count = _this.queue[0].count ? _this.queue[0].count + 1 : 1;

                var item = _this.queue[0];
                _this.handler = item.handler;
                _this.signalType = item.signalType;

                _this.sendData(item.data);
            }
        }, 150);
        return _this;
    }

    _createClass(SerialClient, [{
        key: 'reset',
        value: function reset(err, data) {
            if (err && typeof this.handler === 'function') {
                this.handler(err, data);
            }

            this.queue.shift();
            this.handler = null;
            this.signalType = null;
            this.isRequest = false;
        }
    }, {
        key: 'send',
        value: function send(data, signalType, handler) {
            this.queue.push({ data: data, signalType: signalType, handler: handler });
        }
    }, {
        key: 'sendData',
        value: function sendData(data) {
            var _this2 = this;

            this.port.write(util.generateCommand(data), function (err) {
                if (err) throw err;

                if (!_this2.handler) _this2.reset(null); // 如果没有回调函数，则继续下一个请求
                console.log('----------------------------command is send... ' + new Date().getTime());
            });
        }
    }, {
        key: 'handleData',
        value: function handleData(data) {

            var command = data.substr(6, 2);

            if (command.startsWith('4')) return; // 如果是串口的应答帧则忽略

            if (command === SIGNALTYPE.DEVICE_ONLINE) return this.deivceOnline(data);

            // 如果没有回调函数则重置，开始下一个请求
            if (this.handler === null) {
                this.reset();
                return;
            }

            if (typeof this.handler === 'function' && command === this.signalType && typeof this.commandHandlers[this.signalType] === 'function') {

                this.commandHandlers[this.signalType](data, this.handler);
            }

            this.reset(null, data);
        }

        // end region

    }, {
        key: 'deivceOnline',
        value: function deivceOnline(data) {
            var self = this;

            var addr = data.substr(10, 4);
            var mac = data.substr(22, 16);

            this.emit('deviceOnline', { addr: addr, mac: mac });
        }
    }, {
        key: 'checkReceiveData',
        value: function checkReceiveData(data) {
            var frameLength = parseInt(data.substr(2, 2), 16);
            if (frameLength * 2 !== data.length) return false;

            var xor = util.xorChecker(data.substring(0, data.length - 2));
            return xor === data.substr(data.length - 2);
        }
    }]);

    return SerialClient;
}(EventEmitter);

module.exports = SerialClient;