'use strict';

var util = {
    xorChecker: function xorChecker(data) {
        if (data) {
            var sum = parseInt(data.substr(0, 2), '16');
            for (var i = 2; i < data.length; i += 2) {
                sum ^= parseInt(data.substr(i, 2), '16');
            }
            sum = (+sum).toString(16);
            if (sum.length === 1) return '0' + sum;
            return sum;
        }

        return '';
    },
    generateCommand: function generateCommand(data) {
        data += util.xorChecker(data);
        return Buffer.from(data, 'hex');
    },
    strReverse: function strReverse(str) {
        return str.split('').reverse().join('');
    },
    padLeft: function padLeft(str, len) {
        var val = '0'.repeat(len - str.length) + str;

        return val;
    }
};

module.exports = util;