class NDEFHelper {

    static encapsulate(data, blockSize = 4) {

        if (data.length > 0xfffe) {
            throw new Error('Maximal NDEF message size exceeded.');
        }

        const prefix = Buffer.allocUnsafe(data.length > 0xfe ? 4 : 2);
        prefix[0] = 0x03; // NDEF type
        if (data.length > 0xfe) {
            prefix[1] = 0xff;
            prefix.writeInt16BE(data.length, 2);
        } else {
            prefix[1] = data.length;
        }

        const suffix = Buffer.from([0xfe]);

        const totalLength = prefix.length + data.length + suffix.length;
        const excessLength = totalLength % blockSize;
        const rightPadding = excessLength > 0 ? blockSize - excessLength : 0;
        const newLength = totalLength + rightPadding;

        return Buffer.concat([prefix, data, suffix], newLength);

    }

    static clean(data) {

        if (data[0] !== 0x03) {
            return false; // this is not an ndef formatted message
        }

        let prefixLength = 2;

        let dataLength = 0;
        if (data[1] === 0xfe) {
            prefixLength = 4;
            dataLength = buffer.readInt16BE(2);
        } else {
            dataLength = data[1];
        }

        return data.slice(prefixLength, prefixLength + dataLength);
    }

    static isNdef(data) {
        return data[0] === 0x03
    }

    static parseBytes(name, data, length) {

        if (!(data instanceof Buffer) && typeof data !== 'string') {
            throw new Error(`${name} must an instance of Buffer or a HEX string.`);
        }

        if (Buffer.isBuffer(data)) {

            if (data.length !== length) {
                throw new Error(`${name} must be ${length} bytes long.`);
            }

            return data;

        }

        if (typeof data === 'string') {

            if (data.length !== length * 2) {
                throw new Error(`${name} must be a ${length * 2} char HEX string.`);
            }

            return Buffer.from(data, 'hex');

        }

        throw new Error(`${name} must an instance of Buffer or a HEX string.`);

    };

}

module.exports = NDEFHelper;