var path = require('path');
var http = require('http');
var express = require('express');

var config = require('./config.json');

var app = express();
var httpPort = process.env.PORT || 3000;

var httpServer = http.createServer(app);

// Middleware
// app.use(function (req, res, next) {
//     if (req.path === '/manifest.json') {
//         console.log('app manifest header set!');
//         res.set('Content-Type', 'application/manifest+json');
//     } else {
//         console.log('Passthrough:', req.path);
//     }
//     next();
// });
app.use(express.static(path.join(__dirname, 'public')));
// serve ACME challenges for Let's Encrypt
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