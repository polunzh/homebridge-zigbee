'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SerialClient = require('./serialclient');
var SIGNALTYPE = require('./config').SIGNALTYPE;
var EventEmitter = require('events');
var util = require('./util');

var OsramClient = function (_EventEmitter) {
    _inherits(OsramClient, _EventEmitter);

    function OsramClient() {
        _classCallCheck(this, OsramClient);

        var _this = _possibleConstructorReturn(this, (OsramClient.__proto__ || Object.getPrototypeOf(OsramClient)).call(this));

        _this.serialClient = new SerialClient();

        _this.serialClient.on('deviceOnline', function (data) {
            _this.emit('deviceOnline', data);
        });
        return _this;
    }

    _createClass(OsramClient, [{
        key: 'getEndPoint',
        value: function getEndPoint(addr, callback) {
            var data = 'FE0A020302' + addr + '0088';
            this.serialClient.send(data, SIGNALTYPE.ENDPOINT, callback);
        }

        /**
         * 查询灯的开/关状态
         * 
         * @memberof SerialClient
         */

    }, {
        key: 'getBulbSwitchState',
        value: function getBulbSwitchState(addr, endpoint, callback) {
            var data = 'FE0C050502' + addr + endpoint + '880000';
            this.serialClient.send(data, SIGNALTYPE.BULB_SWITCH_STATE, callback);
        }
    }, {
        key: 'getBulbBrightness',
        value: function getBulbBrightness(addr, endpoint, callback) {
            var data = 'FE0C050602' + addr + endpoint + '880000';
            this.serialClient.send(data, SIGNALTYPE.BULB_BRIGHTNESS_STATE, function (err, brightness) {
                if (err) return callback(err);

                brightness = Math.ceil(brightness / 255.0 * 100);

                return callback(null, brightness);
            });
        }
    }, {
        key: 'getBulbColorTemperature',
        value: function getBulbColorTemperature(addr, endpoint, callback) {
            var data = 'FE0C050802' + addr + endpoint + '880700';
            this.serialClient.send(data, SIGNALTYPE.BULB_COLORTEMPERATURE_STATE, function (err, temperature) {});
        }
    }, {
        key: 'getBulbState',
        value: function getBulbState(addr, endpoint, callback) {
            var _this2 = this;

            this.getBulbSwitchState(addr, endpoint, function (err, state) {
                if (err) return callback(err);

                _this2.getBulbBrightness(addr, endpoint, function (err, brightness) {
                    return callback(null, { power: state, brightness: brightness });
                });
            });
        }
    }, {
        key: 'switchBulb',
        value: function switchBulb(state, addr, endpoint) {
            var val = state ? '01' : '00';
            var data = 'FE0B050102' + addr + endpoint + '88' + val;
            console.log('---------------------', state);
            console.log(data);

            this.serialClient.send(data, SIGNALTYPE.SWITCHBULB);
        }
    }, {
        key: 'setBrightness',
        value: function setBrightness(value, addr, endpoint) {
            value = Number(value);
            value = value > 100 ? 100 : value;
            value = value < 0 ? 0 : value;

            value = Math.ceil(value / 100.0 * 254);
            value = util.padLeft(value.toString(16), 2);

            var data = 'FE0E050202' + addr + endpoint + '8800' + value + '0000';
            this.serialClient.send(data, null);
        }
    }, {
        key: 'setColorTemperature',
        value: function setColorTemperature(value, addr, endpoint) {
            value = Number(value);
            value = value > 370 ? 370 : value;
            value = value < 160 ? 160 : value;

            value = util.padLeft(value.toString(2), 16);
            var high = util.padLeft(parseInt(value.substr(0, 8), 2).toString(16), 2);
            var low = util.padLeft(parseInt(value.substr(8, 8), 2).toString(16), 2);

            var data = 'fe0e050402' + addr + endpoint + '88' + low + high + '0000';
            this.serialClient.send(data, null);
        }
    }]);

    return OsramClient;
}(EventEmitter);

module.exports = OsramClient;