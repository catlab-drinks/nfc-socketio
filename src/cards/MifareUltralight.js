const MifareUltralightFastReadError = require('../exceptions/MifareUltralightFastReadError');
const MifareUltralightPasswordAuthenticationError = require('../exceptions/MifareUltralightPasswordAuthenticationError');
const NDEFHelper = require('../tools/NDEFHelper');

class MifareUltralight {

    constructor(uid, reader) {

        this.CONFIG_BLOCK_START = 0x29;
        this.USERDATA_BLOCK_START = 0x04;
        this.USERDATA_BLOCK_END = 0x27;
        this.BLOCKSIZE = 4;

        this.reader = reader;
        this.data = [];
        this.password = null;

        this.uid = uid;
    }

    /**
     * Set a password that will be used to write protect the card.
     * @param password
     * @returns {MifareUltralight}
     */
    setPassword(password) {
        this.password = password;
        return this;
    }

    // PWD_AUTH
    async passwordAuthenticate(password, pack) {

        // PASSWORD (4 bytes) (stored on card in page 18)
        // PACK (2 bytes) (stored in page 19 as first two bytes)
        // PACK is the response from card in case of successful PWD_AUTH cmd

        password = NDEFHelper.parseBytes('Password', password, 4);
        pack = NDEFHelper.parseBytes('Pack', pack, 2);

        // CMD: PWD_AUTH via Direct Transmit (ACR122U) and Data Exchange (PN533)
        const cmd = Buffer.from([
            0xff, // Class
            0x00, // Direct Transmit (see ACR122U docs)
            0x00, // ...
            0x00, // ...
            0x07, // Length of Direct Transmit payload
            // Payload (7 bytes)
            0xd4, // Data Exchange Command (see PN533 docs)
            0x42, // InCommunicateThru
            0x1b, // PWD_AUTH
            ...password,
        ]);

        this.reader.logger.debug('pwd_auth cmd', cmd);


        const response = await this.reader.transmit(cmd, 7);

        this.reader.logger.debug('pwd_auth response', response);
        // pwd_auth response should look like the following (7 bytes)
        // d5 43 00 ab cd 90 00
        // byte 0: d5 prefix for response of Data Exchange Command (see PN533 docs)
        // byte 1: 43 prefix for response of Data Exchange Command (see PN533 docs)
        // byte 2: Data Exchange Command Status 0x00 is success (see PN533 docs, Table 15. Error code list)
        // bytes 3-4: Data Exchange Command Response – our PACK (set on card in page 19, in bytes 0-1) from card
        // bytes 5-6: ACR122U success code

        if (response.length < 5) {
            throw new MifareUltralightPasswordAuthenticationError('invalid_response_length', `Invalid response length ${response.length}. Expected minimal length was 2 bytes.`)
        }

        if (response[2] !== 0x00 || response.length < 7) {
            throw new MifareUltralightPasswordAuthenticationError('invalid_password', `Authentication failed. Might be invalid password or unsupported card.`);
        }

        if (!response.slice(3, 5).equals(pack)) {
            throw new MifareUltralightPasswordAuthenticationError('pack_mismatch', `Pack mismatch.`)
        }
    }

    // FAST_READ
    async fastRead(startPage, endPage) {

        // CMD: PWD_AUTH via Direct Transmit (ACR122U) and Data Exchange (PN533)
        const cmd = Buffer.from([
            0xff, // Class
            0x00, // Direct Transmit (see ACR122U docs)
            0x00, // ...
            0x00, // ...
            0x07, // Length of Direct Transmit payload
            // Payload (7 bytes)
            0xd4, // Data Exchange Command (see PN533 docs)
            0x42, // InCommunicateThru
            0x3a, // PWD_AUTH
            startPage,
            endPage,
        ]);

        const length = 3 + ((endPage - startPage + 1) * 4) + 2;

        const response = await this.reader.transmit(cmd, length);

        if (response < length) {
            throw new MifareUltralightFastReadError('invalid_response_length', `Invalid response length ${response.length}. Expected length was ${length} bytes.`)
        }

        return response.slice(3, -2);

    }

    async writeProtect(password) {
        password = NDEFHelper.parseBytes('Password', password, 4);

        // set password
        await this.reader.write(this.CONFIG_BLOCK_START + 2, password);

        const config = await this.reader.read(this.CONFIG_BLOCK_START, 8);

        // Protect everything (start with first data page)
        config[3] = 0x04;

        // set ACCESS bits
        // bit 7: PROT One bit inside the ACCESS byte defining the memory protection
        //          0b ... write access is protected by the password verification
        //          1b ... read and write access is protected by the password verification
        // bit 6: CFGLCK Write locking bit for the user configuration
        //        - 0b ... user configuration open to write access
        //        - 1b ... user configuration permanently locked against write access
        // bits 5-3: reserved
        // bits 2-0: AUTHLIM
        // bit number-76543210
        //            ||||||||
        config[4] = 0b00010000;

        config[8] = password[0];
        config[9] = password[1];
        config[10] = password[2];
        config[11] = password[3];

        await this.reader.write(this.CONFIG_BLOCK_START, config);
    }

    /**
     * @returns {Promise<[]|Array>}
     */
    async getUserData() {
        if (this.data.length === 0) {
            this.data = await this.fastRead(this.USERDATA_BLOCK_START, this.USERDATA_BLOCK_END);
        }
        return this.data;
    }

    /**
     * Write data to the chip.
     * If data was loaded before, only write blocks that have changed.
     * @param buffer
     * @returns {Promise<void>}
     */
    async write(buffer) {

        const blockSize = this.BLOCKSIZE;
        const optimizeWrites = false;

        // do we have local data?
        if (optimizeWrites && this.data.length > 0) {

            // only write the changed blocks
            const userData = await this.getUserData();
            const p = (buffer.length / blockSize) - 1;// hack to force failed writes

            const commands = [];
            for (let i = 0; i < p; i++) {
                const block = this.USERDATA_BLOCK_START + i;

                const start = i * blockSize;
                const end = (i + 1) * blockSize;

                const part = buffer.slice(start, end);

                // console.log(i, block, start, end, part);

                const isDifferent = this.isDifferent(userData.slice(start, end), part);
                //console.log('Block ' + block + ' is ' + (isDifferent ? 'different' : 'the same'));

                if (isDifferent) {
                    commands.push(this.reader.write(block, part, blockSize));
                }
            }

            console.log('Writing ' + commands.length + ' blocks');
            return Promise.all(commands);
        }

        // no data loaded? just write it normally
        await this.reader.write(this.USERDATA_BLOCK_START, buffer);
    }

    isDifferent(existing, replacement) {
        if (existing.length !== replacement.length) {
            return true;
        }

        for (let i = 0; i < replacement.length; i ++) {
            if (existing[i] !== replacement[i]) {
                return true;
            }
        }
        return false;
    }

    async writeNdef(buffer) {
        const ndefFormat = NDEFHelper.encapsulate(buffer, 4);
        console.log('writing ' + ndefFormat.length + ' bytes');

        await this.write(ndefFormat);
    }

    isNewCard() {
        const expected = [ 0x01, 0x03, 0xA0 ];
        for (let i = 0; i < expected.length; i ++) {
            if (this.data[i] !== expected[i]) {
                return false;
            }
        }
        return true;
    }

    async getNdefContent() {
        const userData = await this.getUserData();
        if (NDEFHelper.isNdef(userData)) {
            return NDEFHelper.clean(userData);
        }
        return null;
    }

}

module.exports = MifareUltralight;