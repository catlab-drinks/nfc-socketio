NFC socket.io server
====================

A webservice that exposes NFC methods through a socket.io connection.
Currently mainly aimed towards reading and writing NDEF messages on TAG215.

Installation
------------
Make sure libnfc is working and that you blacklist the required modules.
https://github.com/nfc-tools/libnfc

LED & Beeper:
https://github.com/pokusew/nfc-pcsc/issues/13