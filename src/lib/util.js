const util = {
    xorChecker(data) {
        if (data) {
            let sum = parseInt(data.substr(0, 2), '16');
            for (let i = 2; i < data.length; i += 2) {
                sum ^= parseInt(data.substr(i, 2), '16');
            }
            sum = (+sum).toString(16);
            if (sum.length === 1) return '0' + sum;
            return sum;
        }

        return '';
    },
    generateCommand(data) {
        data += util.xorChecker(data);
        return Buffer.from(data, 'hex');
    },
    strReverse(str) {
        return str.split('').reverse().join('');
    },
    padLeft(str, len) {
        let val = '0'.repeat(len - str.length) + str;

        return val;
    },
    hex2a(data) {
        let hex = data.toString();
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str;
    }
};

module.exports = util;