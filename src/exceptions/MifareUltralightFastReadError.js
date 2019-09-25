const {TransmitError} = require("nfc-pcsc/dist/errors");

class MifareUltralightFastReadError extends TransmitError {

    constructor(code, message, previousError) {

        super(code, message, previousError);

        this.name = 'MifareUltralightFastReadError';

    }

}

module.exports = MifareUltralightFastReadError;