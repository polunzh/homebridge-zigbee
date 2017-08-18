module.exports = lib = {
    xorChecker(data) {
        if (data) {
            let sum = parseInt(data.substr(0, 2), '16');
            for (let i = 2; i < data.length; i += 2) {
                sum ^= parseInt(data.substr(i, 2), '16');
            }
            return (+sum).toString(16);
        }

        return '';
    },
    generateCommand(data) {
        data += lib.xorChecker(data);
        return Buffer.from(data, 'hex');
    }
};