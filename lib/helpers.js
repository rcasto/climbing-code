var debug = require('debug');

function tryParseJSON(json) {
    try {
        return JSON.parse(json);
    } catch(error) {
        return null;
    }
}

function sendToAllButSender(sender, clients, msg) {
    clients.forEach(function (client) {
        if (client !== sender) {
            // Relay message to other clients
            client.send(JSON.stringify(msg), function (error) {
                if (error) {
                    error('Error relaying message',
                        JSON.stringify(error));
                }
            });
        }
    });
}

function createLoggers(name) {
    var error = debug(name + ':error');
    var logger = debug(name + ':log');
    logger.log = console.log.bind(console);
    return {
        error: error,
        log: logger
    };
}

function selectRandomKey(obj) {
    var keys = Object.keys(obj);
    var numKeys = keys.length;
    var randomIndex = Math.floor(Math.random() * numKeys);
    return keys[randomIndex];
}

module.exports = {
    tryParseJSON: tryParseJSON,
    sendToAllButSender: sendToAllButSender,
    createLoggers: createLoggers,
    selectRandomKey: selectRandomKey
};