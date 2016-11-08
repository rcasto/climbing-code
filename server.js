var path = require('path');
var express = require('express');

var config = require('./config.json');

var app = express();
var port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

app.get('/api/config', function (req, res) {
    res.json(config);
});

app.listen(port, function () {
    console.log('Server started on port:', port);
});