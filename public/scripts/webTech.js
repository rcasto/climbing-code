(function () {
    var ws = null;
    var config = null;

    var peers = {};
    var id = null;

    var rtcPeerConfig = {
        iceServers: null
    };
    var rtcDataChannelConfig = {
        label: 'chat-room',
        ordered: true
    };

    // Set up some DOM stuff
    var connectButton = document.getElementById('connect-button');
    var chatContainer = document.getElementById('chat');
    var chatWindow = document.getElementById('chat-window');
    var chatInput = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-button');
    var connectionStatus = document.getElementById('connection-status');

    // This button should only be enabled when ready conditions are met
    connectButton && (connectButton.onclick = function () {
        connectButton.disabled = true;
        relaySignal({
            type: 'connect'
        });
    });

    function createPeer(name, servers) {
        if (!peers[name]) {
            peers[name] = {
                rtc: new WebRTCPeer(relaySignal, rtcPeerConfig, {
                    ondatachannel: function (event) {
                        peers[name].channel = event.channel;
                        addDataChannelHandlers(peers[name].channel, name);
                    }
                }),
                channel: null
            };
        }
        return peers[name];
    }

    function isReady() {
        return !!(ws && config);
    }

    function onError(error) {
        console.error(JSON.stringify(error));
        connectionStatus.innerHTML = "Error occurred";
        chatInput.disabled = true;
        connectButton.disabled = false;
    }

    function cleanUpAndReport(id, error) {
        console.log('Cleaning up:', id);
        delete peers[id];
        onError(error);
    }

    function relaySignal(signal) {
        ws && ws.send(JSON.stringify(signal));
    }

    function addDataChannelHandlers(channel, id) {
        channel.onopen = function () {
            document.dispatchEvent(new Event('channelReady'));
        };
        channel.onmessage = function (msg) {
            // send message to other data channels
            for (var peerName in peers) {
                if (peerName !== id) {
                    peers[peerName].channel.send(msg.data);
                }
            }
            showMessage(msg.data);
        };
        channel.onerror = onError;
    }

    function sendMessage(isSender) {
        Object.keys(peers).forEach(function (peer) {
            peers[peer].channel.send(chatInput.value);
        });
        showMessage(chatInput.value, true);
        chatInput.value = "";
        sendButton.disabled = true;
    }

    function showMessage(msg, isSender) {
        var div = document.createElement('div');
        var text = document.createTextNode(msg);
        div.className = "chat-message ";
        div.className += isSender ? "message-sent" : "message-received";
        div.appendChild(text);
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Register Service Worker if supported
    if (Helpers.isServiceWorkerSupported()) {
        navigator.serviceWorker.register('serviceWorker.js', {
            scope: '/'
        }).then(function (registration) {
            console.log('Service worker registered:', JSON.stringify(registration));
        }, onError);
    }

    if (Helpers.isWebSocketSupported() &&
        Helpers.isWebRTCSupported()) 
    {
        // Fetch the client configuration
        Request.get('/api/config').then(function (data) {
            return Helpers.tryParseJSON(data);
        }).then(function (data) {
            config = data;
            rtcPeerConfig.iceServers = config.iceServers;

            // Web Socket setup
            var protocol = config.isSecure ? 'wss://' : 'ws://';
            
            ws = new WebSocket(protocol + config.domain);
            ws.onopen = function () {
                console.log('Web Socket connection opened');
            };
            ws.onmessage = function (event) {
                var msg = Helpers.tryParseJSON(event.data);

                if (msg) {
                    switch (msg.type) {
                        case 'id':
                            id = msg.data;
                            connectButton.disabled = !isReady();
                            break;
                        case 'connect':
                            console.log('Connection info:', msg);
                            var peer = createPeer(msg.target, config.iceServers);
                            peer.rtc.giveOffer({
                                target: msg.target
                            }).catch(onError);
                            peer.rtc.addChannel(rtcDataChannelConfig).then(function (channel) {
                                peer.channel = channel;
                                addDataChannelHandlers(peer.channel, msg.target);
                            });
                            break;
                        case 'offer':
                            var peer = createPeer(msg.id, config.iceServers);
                            peer.rtc.acceptOffer(msg.data, {
                                target: msg.id
                            }).then(function () {
                                console.log('Offer accepted successfully');
                            }, cleanUpAndReport.bind(null, msg.id));
                            break;
                        case 'answer':
                            peers[msg.id] && peers[msg.id].rtc
                                .acceptAnswer(msg.data)
                                .then(function () {
                                    console.log('Answer accepted successfully');
                                }, cleanUpAndReport.bind(null, msg.id));
                            break;
                        case 'candidate':
                            peers[msg.id] && peers[msg.id].rtc
                                .acceptCandidate(msg.data)
                                .catch(cleanUpAndReport.bind(null, msg.id));
                            break;
                        case 'close':
                            delete peers[msg.id];
                            break;
                        default:
                            onError({
                                msg: 'Invalid message type:',
                                data: msg
                            });
                    }
                }
            };
            ws.onerror = onError;
        }).catch(onError);

        document.addEventListener('channelReady', function () {
            chatInput.disabled = false;
            connectionStatus.innerHTML = "Connected";

            // Focus the chat input
            chatInput.focus();

            chatInput.onkeydown = function (event) {
                if (event.keyCode === 13) {
                    sendMessage(true);
                }
            };
            chatInput.oninput = function () {
                sendButton.disabled = !chatInput.value;
            };
            sendButton.onclick = function () {
                sendMessage(true);
            };
        });
    }
}());