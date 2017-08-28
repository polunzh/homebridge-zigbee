class DataHandler {
    endpointAddressHandler(data, hd) {
        const addr = data.substr(10, 4);
        const endpoint = data.substr(-4, 2);

        return hd(null, { addr, endpoint });
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