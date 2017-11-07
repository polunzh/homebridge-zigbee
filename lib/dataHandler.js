const util = require('./util');
class DataHandler {

    endpointAddressHandler(data, hd) {
        const addr = data.substr(10, 4);
        const endpointCount = parseInt(data.substr(20, 2), 16);
        const endpoints = new Array(endpointCount);

        for (let i = 0; i < endpointCount; i++) {
            endpoints[i] = data.substr(22 + i * 2, 2);
        }

        return hd(null, {
            addr,
            endpoints
        });
    }

    firmwarefoHandler(data, hd) {
        console.log('firmware information...')
        console.log(data);

        return hd(data);
    }

    networkDeviceTypeInfoHandler(data, hd) {
        let dIdL = data.substr(24, 2);
        let dIdH = data.substr(26, 2);
        let dataType = dIdH + dIdL;

        return hd(null, dataType);
    }

    haDeviceInfoHandler(data, hd) {
        let manuName = '',
            model = '',
            firm = '';

        let manuNameBit = data.substr(20, 32);
        let modelBit = data.substr(52, 32);
        let firmBit = data.substr(82, 32);

        const emptyFlag = 'ff' * 16;
        if (manuNameBit.toLowerCase() !== emptyFlag) manuName = util.hex2a(manuNameBit);
        if (modelBit.toLowerCase() !== emptyFlag) model = util.hex2a(modelBit);
        if (firmBit.toLowerCase() !== emptyFlag) firm = util.hex2a(firmBit);

        return hd(null, {
            manuName,
            model,
            firm
        });
    }

    bulbSwitchStateHandler(data, hd) {
        let state = parseInt(data.substr(-4, 2), 16);
        state = state !== 0x0;

        return hd(null, state);
    }

    bulbBrightnessStateHandler(data, hd) {
        let val = data.substr(-4, 2);

        return hd(null, parseInt(val, 16));
    }

    bulbColorTemperatureStateHandler(data, hd) {
        let val = data.substr(-4, 2);

        return hd(null, parseInt(val, 16));
    }

    networkOpenHandler(data, hd) {
        let state = data.substr(-4, 2);

        return hd(null, state);
    }
}

module.exports = DataHandler;