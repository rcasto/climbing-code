var express = require('express');
var helpers = require('./helpers');
var config = require('../config.json');

var router = express.Router();

var loggers = helpers.createLoggers('app-router');
var logger = loggers.log;

router.get('/', function (req, res) {
    logger('Client requested index.html');
    res.sendFile('index.html');
});
router.get('/api/config', function (req, res) {
    logger('Config requested', req.url, req.hostname);
    if (process.env.PORT) {
        config.port = process.env.PORT;
    } else {
        config.port = req.secure ? 443 : 80;
    }
    config.domain = req.hostname;
    config.isSecure = req.secure;
    res.json(config);
});

module.exports = router;