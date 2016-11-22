var path = require('path');
var http = require('http');
var express = require('express');
var compression = require('compression');
var webSocketServer = require('ws').Server;

var config = require('./config.json');
var helpers = require('./lib/helpers');
var socketServer = require('./lib/socketServer');
var appRouter = require('./lib/appRouter');

var loggers = helpers.createLoggers('app');
var error = loggers.error;
var logger = loggers.log;

// Set up environment configuration
var httpPort = process.env.PORT || 3000;
if (process.env.NODE_ENV === 'production') {
    config.isSecure = true;
} else {
    config.domain = 'localhost:' + httpPort;
    config.isSecure = false;
}

var httpServer = http.createServer();
var wss = new webSocketServer({
    server: httpServer
});
var app = express();
var appRouter = require('./lib/appRouter')(config);

// Add socket Handling
socketServer(wss);

// Use gzip compression
app.use(compression());

// Setup static route for website assets
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')));

// Serve ACME challenges for Let's Encrypt
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// Use the app router
app.use(appRouter);

// Start up the server, route requests to Express
httpServer.on('request', app);
httpServer.listen(httpPort, function () {
    logger('Http server listening on port', httpPort);
});