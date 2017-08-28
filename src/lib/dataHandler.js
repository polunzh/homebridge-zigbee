const util = require('./util');
class DataHandler {
    endpointAddressHandler(data, hd) {
        const addr = data.substr(10, 4);
        const endpoint = data.substr(-4, 2);

        return hd(null, { addr, endpoint });
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

        console.log(manuNameBit, modelBit, firmBit);
        console.log(manuName, model, firm);
        return { manuName, model, firm };
    }

    bulbSwitchStateHandler(data, hd) {
        let state = data.substr(-4, 2);

        return hd(null, parseInt(state, 16));
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