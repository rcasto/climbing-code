(function () {
    var ws = null;
    var name = null;
    var rtcPeer = null;
    var rtcDataChannel = null;
    var config = null;
    var isConnected = false;

    // Set up some DOM stuff
    var connectButton = document.getElementById('connect-button');
    var chatContainer = document.getElementById('chat');
    var chatWindow = document.getElementById('chat-window');
    var chatInput = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-button');
    var connectionStatus = document.getElementById('connection-status');

    // This button should only be enabled when ready conditions are met
    connectButton && (connectButton.onclick = function () {
        initWebRTC(config.iceServers);
    });

    function initWebRTC(servers, initiatedRemotely) {
        var rtcPeerConfig = {
            iceServers: servers
        };
        var rtcDataChannelConfig = {
            label: 'tic-tac-toe',
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

        rtcPeer = new WebRTCPeer(relaySignal, rtcPeerConfig, rtcPeerHandlers);

        if (!initiatedRemotely) {
            rtcPeer.giveOffer();
            rtcDataChannel = rtcPeer.addChannel(rtcDataChannelConfig, rtcDataChannelHandlers);
        }
    }

    function isReady() {
        return !!(ws && config);
    }

    function onError(error) {
        console.error(JSON.stringify(error));
        connectionStatus.innerHTML = "Error occurred";
    }

    function relaySignal(signal) {
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

                if (!rtcPeer) {
                    initWebRTC(config.iceServers, true);
                }

                if (msg && !isConnected) {
                    switch (msg.type) {
                        case 'offer':
                            rtcPeer.acceptOffer(msg.data);
                            break;
                        case 'answer':
                            rtcPeer.acceptAnswer(msg.data);
                            break;
                        case 'candidate':
                            rtcPeer.acceptCandidate(msg.data);
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
    }
}());