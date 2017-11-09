const ZigbeeClient = require('./lib/zigbeeClient');
const util = require('./lib/util');

const zigbeeClient = new ZigbeeClient();
// console.log(util.generateCommand('FE0E050202d37a038800dd0000'));
// console.log(util.generateCommand('FE0E050402d37a038899000200'));

const osaddr = '542b';
const osendpoint = '03';

const saddr = '9da2';
const sendpoint = '0a';

zigbeeClient.openNetwork(function(err, res) {
		console.log('--------------open network-------------');
		console.log(err, res);
		/*
		   osramclient.setBrightness(21, saddr, sendpoint);
		   osramclient.getBulbBrightness(saddr, sendpoint, function(err, res) {
		   console.log('control...'.repeat(10));
		   console.log(err, res);
		   });
		   osramclient.getBulbSwitchState(saddr, sendpoint, function(err, res) {
		   console.log('getBulbSwitchState...'.repeat(10));
		   console.log(err, res);
		   });
		   osramclient.switchBulb(false, saddr, sendpoint);
		   osramclient.getEndPoint(saddr, function(err, res) {
		   console.log('getEndPoint...'.repeat(10));
		   console.log(err, res);
		   });
		   osramclient.getDeviceTypeInfo(saddr, sendpoint, function(err, res){
		   console.log(res);
		   });
		osramclient.getFirmware(saddr, sendpoint, function(err, res) {
				console.log('firmware...'.repeat(10));
				console.log(err, res);
				});
		 */
		osramclient.getHADeviceInfo(saddr, sendpoint, function(err, res) {
				console.log('------HA DEVICE info------');
				console.log(err, res);
				});
});
