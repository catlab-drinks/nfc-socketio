NFC socket.io server
====================

A webservice that exposes NFC methods through a socket.io connection.
Currently mainly aimed towards reading and writing NDEF messages on TAG215.

Installation
------------

```
sudo apt install libtool-bin
sudo apt install libpcsclite1 libpcsclite-dev
sudo apt install pcscd
npm install

```

Make sure libnfc is working and that you blacklist the required modules.
https://github.com/nfc-tools/libnfc

LED & Beeper:
https://github.com/pokusew/nfc-pcsc/issues/13

PM2
https://www.digitalocean.com/community/tutorials/how-to-use-pm2-to-setup-a-node-js-production-environment-on-an-ubuntu-vps


```
pm2 startup
```