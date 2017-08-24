module.exports = util = {
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
        console.log(data);
        return Buffer.from(data, 'hex');
    }
};