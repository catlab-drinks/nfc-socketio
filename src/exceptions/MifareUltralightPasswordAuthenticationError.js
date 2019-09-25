const {TransmitError} = require("nfc-pcsc/dist/errors");

class MifareUltralightPasswordAuthenticationError extends TransmitError {

    constructor(code, message, previousError) {

        super(code, message, previousError);

        this.name = 'MifareUltralightPasswordAuthenticationError';

    }

}

module.exports = MifareUltralightPasswordAuthenticationError;