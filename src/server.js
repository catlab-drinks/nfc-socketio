var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});

exports.http = http;
exports.io = io;