(function () {
    var ws = null;
    var name = null;
    var rtcDataChannel = null;
    var config = null;
    var isConnected = false;

    var peers = {};
    var idCounter = 0;
    
    var id = null;

    // Set up some DOM stuff
    var connectButton = document.getElementById('connect-button');
    var chatContainer = document.getElementById('chat');
    var chatWindow = document.getElementById('chat-window');
    var chatInput = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-button');
    var connectionStatus = document.getElementById('connection-status');

    // This button should only be enabled when ready conditions are met
    connectButton && (connectButton.onclick = function () {
        createPeer(config.iceServers);
    });

    function createPeer(servers, initiatedRemotely) {
        var rtcPeerConfig = {
            iceServers: servers
        };
        var rtcDataChannelConfig = {
            label: 'chat-room',
            ordered: true
        };

        var rtcPeerHandlers = {
            ondatachannel: initiatedRemotely ? 
                function (event) {
                    console.log('Data Channel event',
                        JSON.stringify(event));
                    rtcDataChannel = event.channel;
                    Helpers.addHandlers(rtcDataChannel, rtcDataChannelHandlers);
                } : null
        };
        var rtcDataChannelHandlers = {
            onopen: function () {
                document.dispatchEvent(new Event('channelReady'));
            },
            onmessage:function (msg) {
                showMessage(msg.data);
            },
            onerror: onError
        };

        var id = idCounter;
        var peer = new WebRTCPeer(function (signal) {
            signal.id = id;
            relaySignal(signal);
        }, rtcPeerConfig, rtcPeerHandlers);
        peers[id] = peer;

        // Increment peer id
        idCounter++;

        if (!initiatedRemotely) {
            peer.giveOffer();
            rtcDataChannel = peer.addChannel(rtcDataChannelConfig, rtcDataChannelHandlers);
        }

        return peer;
    }

    function isReady() {
        return !!(ws && config);
    }

    function onError(error) {
        console.error(JSON.stringify(error));
        connectionStatus.innerHTML = "Error occurred";
    }

    function relaySignal(signal) {
        // Attach id to signal
        signal.id = id;
        ws && ws.send(JSON.stringify(signal));
    }

    function sendMessage(isSender) {
        rtcDataChannel.send(chatInput.value);
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

            // Web Socket setup
            var protocol = config.isSecure ? 'wss://' : 'ws://';
            
            ws = new WebSocket(protocol + config.domain);
            ws.onopen = function () {
                console.log('Web Socket connection opened');
                connectButton.disabled = !isReady();
            };
            ws.onmessage = function (event) {
                var msg = Helpers.tryParseJSON(event.data);

                if (msg && !isConnected) {
                    switch (msg.type) {
                        case 'id':
                            id = msg.data;
                            break;
                        case 'offer':
                            var peer = createPeer(config.iceServers, true);
                            peer.acceptOffer(msg.data);
                            break;
                        case 'answer':
                            console.log('accept answer');
                            // peers[msg.name].acceptAnswer(msg.data);
                            break;
                        case 'candidate':
                            peers[msg.name].acceptCandidate(msg.data);
                            break;
                        case 'close':
                            break;
                        default:
                            onError({
                                msg: 'Invalid message type:',
                                data: msg
                            });
                    }
                }
            };
            ws.onclose = function () {
                console.log('Web socket closed');
            };
            ws.onerror = onError;
        }).catch(onError);

        document.addEventListener('channelReady', function () {
            isConnected = true;
            chatInput.disabled = false;
            connectionStatus.innerHTML = "Connected";
            connectButton.disabled = true;

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

        // Tell others that you are leaving
        window.onbeforeunload = function () {

        };
    }
}());