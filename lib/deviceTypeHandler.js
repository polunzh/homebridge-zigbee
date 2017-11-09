module.exports = {
    '0009': function mainsPowerHandler(device, accessory, log) {
        const service = accessory.addService(Service.Outlet, haInfo.manuName);

        const zigbeeAccessory = new ZigbeeAccessory(device, accessory, log, device.state);
        zigbeeAccessory.addEventHandler(Service.Outlet, Characteristic.On);

        return zigbeeAccessory;
    },
    '0101': function dimmableLightHandler(device, accessory, log) {
        const service = accessory.addService(Service.Lightbulb, accessory.context.name);
        service.addCharacteristic(Characteristic.Brightness);

        const zigbeeAccessory = new ZigbeeAccessory(device, accessory, log, device.state);
        zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.On);
        zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.Brightness);
        return zigbeeAccessory;
    },
    '0102': function colorDimmableLightHandler(device, accessory) {
        const service = accessory.addService(Service.Lightbulb, accessory.context.name);
        service.addCharacteristic(Characteristic.Brightness);

        const zigbeeAccessory = new ZigbeeAccessory(device, accessory, log, device.state);
        zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.On);
        zigbeeAccessory.addEventHandler(Service.Lightbulb, Characteristic.Brightness);

        return zigbeeAccessory;
    }
};