var path = require('path');
var http = require('http');
var express = require('express');

var config = require('./config.json');

var app = express();
var httpPort = process.env.PORT || 3000;

var httpServer = http.createServer(app);

// Setup static route for website assets
app.use(express.static(path.join(__dirname, 'public')));

// Serve ACME challenges for Let's Encrypt
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

app.get('/api/config', function (req, res) {
    res.json(config);
});

httpServer.listen(httpPort, function () {
    console.log('Http server listening on port', httpPort);
});