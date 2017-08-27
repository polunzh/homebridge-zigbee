"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DataHandler = function () {
    function DataHandler() {
        _classCallCheck(this, DataHandler);
    }

    _createClass(DataHandler, [{
        key: "endpointAddressHandler",
        value: function endpointAddressHandler(data, hd) {
            var addr = data.substr(10, 4);
            var endpoint = data.substr(-4, 2);

            return hd(null, { addr: addr, endpoint: endpoint });
        }
    }, {
        key: "bulbSwitchStateHandler",
        value: function bulbSwitchStateHandler(data, hd) {
            var state = data.substr(-4, 2);

            return hd(null, parseInt(state, 16));
        }
    }, {
        key: "bulbBrightnessStateHandler",
        value: function bulbBrightnessStateHandler(data, hd) {
            var val = data.substr(-4, 2);

            return hd(null, parseInt(val, 16));
        }
    }, {
        key: "bulbColorTemperatureStateHandler",
        value: function bulbColorTemperatureStateHandler(data, hd) {
            var val = data.substr(-4, 2);

            return hd(null, parseInt(val, 16));
        }
    }]);

    return DataHandler;
}();

module.exports = DataHandler;