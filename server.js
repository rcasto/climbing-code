var path = require('path');
var http = require('http');
var express = require('express');
var webSocketServer = require('ws').Server;
var config = require('./config.json');

var httpPort = process.env.PORT || 3000;
var httpServer = http.createServer();
var wss = new webSocketServer({
    server: httpServer
});
var app = express();

// Setup static route for website assets
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')));

// Serve ACME challenges for Let's Encrypt
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.get('/', function (req, res) {
    res.sendFile('index.html');
});
app.get('/api/config', function (req, res) {
    res.json(config);
});

httpServer.on('request', app);
httpServer.listen(httpPort, function () {
    console.log('Http server listening on port', httpPort);
});

// Handle WebSocket Messages
wss.on('connection', function (ws) {
    console.log('Client connected', wss.clients.length);

    ws.on('message', function (msg) {
        console.log('Message Received');
        sendToAllButSender(ws, msg);
    });
    ws.on('close', function () {
        console.log('Client disconneted');
    });
    ws.on('error', function (error) {
        console.error('Web Socket error:', JSON.stringify(error));
    });
});

function sendToAllButSender(sender, msg) {
    wss.clients.forEach(function (client) {
            if (client !== sender) {
                client.send(msg, function (error) {
                    if (error) {
                        console.error('Error relaying message',
                            JSON.stringify(error));
                    }
                });
            }
    });
}