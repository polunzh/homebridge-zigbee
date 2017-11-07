const DataHandler = require('../lib/dataHandler');
const assert = require('assert');

const dataHandler = new DataHandler();

dataHandler.endpointAddressHandler('fe0e0283029da2000000020a084c', (err, endpoints) => {
    assert.equal(null, err);

    assert.equal(endpoints.endpoints.length, 2);
    assert.equal(endpoints.endpoints[0], '0a');
    assert.equal(endpoints.endpoints[1], '08');
});