var express = require('express');

var appConfig = null;
var router = express.Router();

router.get('/', function (req, res) {
    res.sendFile('index.html');
});
router.get('/api/config', function (req, res) {
    res.json(appConfig);
});

module.exports = function (config) {
    appConfig = config;
    return router;
};