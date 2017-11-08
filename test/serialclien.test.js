const SerialClient = require('../lib/serialclient');
const assert = require('assert');

const serialClient = new SerialClient();
const res = serialClient.parseData('fe0b02440283d60a880066fe1c02840283d60a2300040109000005000003000400150006000007');
console.log(res);