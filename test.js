const OsramClient = require('./lib/osramclient');
const util = require('./lib/util');

const osramclient = new OsramClient();
// console.log(util.generateCommand('FE0E050202d37a038800dd0000'));
// console.log(util.generateCommand('FE0E050402d37a038899000200'));

const osaddr = '542b';
const osendpoint = '03';

const saddr = '6b8f';
const sendpoint = '0A';

osramclient.openNetwork(function(err, res){
	console.log('open network'.repeat(10));
	console.log(err, res);
	/*

	   osramclient.setBrightness(21, 'f5ad', '08');

	   osramclient.getBulbSwitchState(osaddr, osendpoint, function(err, res) {
	   console.log('getBulbSwitchState...'.repeat(10));
	   console.log(err, res);
	   });
	   osramclient.getFirmware(osaddr, osendpoint, function(err, res) {
	   console.log('firmware...'.repeat(10));
	   console.log(err, res);
	   });
	   osramclient.getBulbBrightness(saddr, sendpoint, function(err, res) {
	   console.log('control...'.repeat(10));
	   console.log(err, res);
	   });
	osramclient.getEndPoint(saddr, function(err, res) {
			console.log('getEndPoint...'.repeat(10));
			console.log(err, res);
			});
	 */
	 osramclient.switchBulb(true, saddr, sendpoint);
});
