var path = require('path');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var lex = require('letsencrypt-express');

var config = require('./config.json');

var app = express();
var httpPort = 8000 || 80;
var httpsPort = 3000 || 443;

// Let's Encrypt
var lexConfig = lex.create({
    server: 'staging',
    email: config.email,
    agreeTos: true,
    approveDomains: [config.domain]
});

function redirectToSSL(req, res, next) {
    // /\/\.well-known\/acme-challenge\/[\w-]+/ - save in case
    res.writeHead(301, {
        'Location': `https://${req.headers.host}:${httpsPort}${req.url}`
    });
    res.end();
}

var httpServer = http.createServer(app);
var httpsServer = https.createServer(lexConfig.httpsOptions, lexConfig.middleware(app));

// Middleware
app.use(function (req, res, next) {
    if (req.path === '/manifest.json') {
        console.log('app manifest header set!');
        res.set('Content-Type', 'application/manifest+json');
    } else {
        console.log('Passthrough:', req.path);
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

app.get('/api/config', function (req, res) {
    res.json(config);
});

httpServer.listen(httpPort, function () {
    console.log('Http server listening on port', httpPort);
});

httpsServer.listen(httpsPort, function () {
    console.log('Https server listening on port', httpsPort);
});