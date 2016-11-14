(function () {
    var ws = null;
    var name = null;
    var rtcPeer = null;
    var rtcDataChannel = null;
    var config = null;

    // Set up some DOM stuff
    var peerNameButton = document.getElementById('peer-name-button');
    var chatContainer = document.getElementById('chat');
    var chatWindow = document.getElementById('chat-window');
    var chatInput = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-button');

    // This button should only be enabled when ready conditions are met
    peerNameButton && (peerNameButton.onclick = function () {
        initWebRTC(config.iceServers);
    });

    function initWebRTC(servers, initiatedRemotely) {
        var rtcPeerConfig = {
            iceServers: servers
        };
        var rtcDataChannelConfig = {
            ordered: true
        };
        rtcPeer = new RTCPeerConnection(rtcPeerConfig);
        rtcPeer.onicecandidate = function (event) {
            console.log('Got ICE candidate:', event.candidate);
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate
                }));
            }
        };
        if (initiatedRemotely) {
            rtcPeer.ondatachannel = function (event) {
                console.log('Data Channel event',
                    JSON.stringify(event));
                rtcDataChannel = event.channel;
                setupDataChannel(rtcDataChannel);
            };
        } else {
            rtcPeer.onnegotiationneeded = function () {
                console.log('We need to negotiate!');
                rtcPeer.createOffer().then(function (sdp) {
                    return rtcPeer.setLocalDescription(sdp);
                }).then(function () {
                    ws.send(JSON.stringify({
                        type: 'offer',
                        sdp: rtcPeer.localDescription
                    }));
                }).catch(onError);
            };
            rtcDataChannel = rtcPeer.createDataChannel('tic-tac-toe', 
                rtcDataChannelConfig);
            setupDataChannel(rtcDataChannel);
        }
    }

    function setupDataChannel(dataChannel) {
        dataChannel.onopen = function () {
            document.dispatchEvent(new Event('channelReady'));
        };
        dataChannel.onmessage = function (msg) {
            showMessage(msg.data);
        };
        dataChannel.onerror = onError;
    }

    function isReady() {
        return !!(ws && config);
    }

    function onError(error) {
        console.error(JSON.stringify(error));
    }

    function showMessage(msg, isSender) {
        var div = document.createElement('div');
        var text = document.createTextNode(msg);
        div.className = "chat-message ";
        div.className += isSender ? "message-sent" : "message-received";
        div.appendChild(text);
        chatWindow.appendChild(div);
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
            ws = new WebSocket('wss://' + config.domain);
            ws.onopen = function () {
                console.log('Web Socket connection opened');
                peerNameButton.disabled = !isReady();
            };
            ws.onmessage = function (event) {
                var msg = Helpers.tryParseJSON(event.data);

                if (!rtcPeer) {
                    initWebRTC(config.iceServers, true);
                }

                if (msg) {
                    switch (msg.type) {
                        case 'offer':
                            rtcPeer.setRemoteDescription(msg.sdp).then(function () {
                                return rtcPeer.createAnswer();
                            }).then(function (sdp) {
                                return rtcPeer.setLocalDescription(sdp);
                            }).then(function () {
                                ws.send(JSON.stringify({
                                    type: 'answer',
                                    sdp: rtcPeer.localDescription
                                }));
                            }).catch(onError);
                            break;
                        case 'answer':
                            rtcPeer.setRemoteDescription(msg.sdp).catch(onError);
                            break;
                        case 'candidate':
                            rtcPeer.addIceCandidate(msg.candidate).catch(onError);
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
            chatInput.disabled = false;
            sendButton.disabled = false;

            sendButton.onclick = function () {
                rtcDataChannel.send(chatInput.value);
                showMessage(chatInput.value, true);
                chatInput.value = "";
            };
        });
    }
}());