var path = require('path');
var http = require('http');
var express = require('express');
var compression = require('compression');
var debug = require('debug');
var webSocketServer = require('ws').Server;
var uuid = require('uuid');

var config = require('./config.json');

var error = debug('app:error');
var logger = debug('dev:log');

logger.log = console.log.bind(console);

var httpPort = process.env.PORT || 3000;
var httpServer = http.createServer();
var wss = new webSocketServer({
    server: httpServer
});
var app = express();

// Set up environment configuration
if (process.env.NODE_ENV === 'production') {
    config.isSecure = true;
} else {
    config.domain = 'localhost:' + httpPort;
    config.isSecure = false;
}

// Use gzip compression
app.use(compression());

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
    logger('Http server listening on port', httpPort);
});

// Handle WebSocket Messages
wss.on('connection', function (ws) {
    logger('Client connected', wss.clients.length);

    // Generate id to represent this client and sent it to them
    ws.send(JSON.stringify({
        type: 'id',
        data: uuid()
    }));

    ws.on('message', function (msg) {
        logger('Message Received');

        // Relay message to other clients
        wss.clients.forEach(function (client) {
            if (client !== ws) {
                client.send(msg, function (error) {
                    if (error) {
                        error('Error relaying message',
                            JSON.stringify(error));
                    }
                });
            }
        });
    });
    ws.on('error', function (error) {
        error('Web Socket error:', JSON.stringify(error));
    });
});