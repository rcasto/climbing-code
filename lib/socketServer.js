var uuid = require('uuid');
var helpers = require('./helpers');

var loggers = helpers.createLoggers('socketServer');
var error = loggers.error;
var logger = loggers.log;

// Holds information about each peer, such as who they are connected to
var peerInfo = {};
// Holds id's of connected clients
var connected = {};
// Holds id's of unconnected clients
var unconnected = {};

function cleanup(id) {
    // Let connected peers know that this peer is leaving
    Object.keys(peerInfo[id].peers).forEach(function (peerId) {
        peerInfo[peerId].socket.send(JSON.stringify({
            type: 'close',
            id: id
        }));
        // remove connection to this node from peer
        delete peerInfo[peerId].peers[id];
        if (Object.keys(peerInfo[peerId].peers).length <= 0) {
            delete connected[peerId];
            unconnected[peerId] = true;
        }
    });

    delete peerInfo[id];
    delete connected[id];
    delete unconnected[id];
}

module.exports = function (wss) {
    wss.on('connection', function (ws) {
        logger('Client connected', wss.clients.length);

        // Generate id to represent this client and send it to them
        var id = uuid();

        ws.send(JSON.stringify({
            type: 'id',
            data: id
        }), function (error) {
            if (error) {
                error('Failed to send id assignment to client',
                    JSON.stringify(error));
            }
        });

        // Store in peer map
        peerInfo[id] = {
            socket: ws,
            peers: {}
        };

        ws.on('message', function (msg) {
            msg = helpers.tryParseJSON(msg);

            // add id onto message
            msg.id = id;

            if (msg) {
                logger('Message Received', msg.type);

                switch (msg.type) {
                    case 'connect':
                        var numConnected = Object.keys(connected).length;
                        var numUnconnected = Object.keys(unconnected).length;
                        var clientId = null;
                        
                        if (numConnected > 0) {
                            clientId = helpers.selectRandomKey(connected);
                        } else if (numUnconnected > 0) {
                            clientId = helpers.selectRandomKey(unconnected);
                            delete unconnected[clientId];
                        } else {
                            unconnected[id] = true;
                        }

                        // We found a client, let's trigger the handshake
                        if (clientId) {
                            peerInfo[id].peers[clientId] = true;
                            peerInfo[clientId].peers[id] = true;
                            connected[clientId] = true;
                            connected[id] = true;

                            ws.send(JSON.stringify({
                                type: 'connect',
                                id: id,
                                target: clientId
                            }));
                        }

                        break;
                    default:
                        if (msg.target) {
                            peerInfo[msg.target].socket.send(JSON.stringify(msg));
                        } else {
                            helpers.sendToAllButSender(ws, wss.clients, msg);
                        }
                        break;
                }
            }
        });
        ws.on('close', function () {
            logger('Client disconneted');
            cleanup(id);
        });
        ws.on('error', function (error) {
            error('Web Socket error:', JSON.stringify(error));
            cleanup(id);
        });
    });
};