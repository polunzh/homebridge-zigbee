const SerialClient = require('../lib/serialclient');
const assert = require('assert');

const serialClient = new SerialClient();
const res = serialClient.parseData('fe3b04810244f00a8800486f6e65794765656b20202020202020506f77657220');
console.log(res);