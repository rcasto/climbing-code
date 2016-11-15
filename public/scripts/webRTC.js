/*
    Signaler is a function that is called when a signal needs to be sent to the 
    signal server.  It is passed an object containing the type of signal and 
    any custom data.

    {
        type: 'offer',
        data: { 'data': '123' }
    }

    Types of messages:
    - 'offer'
    - 'answer'
    - 'candidate'
*/
function WebRTCPeer(signaler, options, handlers) {
    console.log('Peer Created');

    this.signaler = signaler;
    this.peerConnection = new RTCPeerConnection(options);

    Helpers.addHandlers(this.peerConnection, handlers);
}
WebRTCPeer.prototype.acceptOffer = function (offer) {
    var self = this;
    this.peerConnection.setRemoteDescription(offer).then(function () {
        return self.peerConnection.createAnswer();
    }).then(function (answer) {
        return self.peerConnection.setLocalDescription(answer);
    }).then(function () {
        self.signaler({
            type: 'answer',
            data: self.peerConnection.localDescription
        });
    }).catch(onError);
};
WebRTCPeer.prototype.acceptAnswer = function (answer) {
    console.log('Accepting Answer');

    this.peerConnection.setRemoteDescription(answer).catch(onError);
};
WebRTCPeer.prototype.acceptCandidate = function (candidate) {
    console.log('Accepting Candidate:', candidate);

    this.peerConnection.addIceCandidate(candidate).catch(onError);
};
WebRTCPeer.prototype.addChannel = function (config, handlers) {
    console.log('Channel Added');

    var channel = this.peerConnection.createDataChannel(config.label, config);
    Helpers.addHandlers(channel, handlers);
    return channel;
};
WebRTCPeer.prototype.giveOffer = function () {
    var self = this;
    this.peerConnection.onnegotiationneeded = function () {
        this.createOffer().then(function (sdp) {
            return self.peerConnection.setLocalDescription(sdp);
        }).then(function () {
            console.log('Offer Sent');
            self.signaler({
                type: 'offer',
                data: self.peerConnection.localDescription
            });
        }).catch(onError);
    };
    this.peerConnection.onicecandidate = function (event) {
        if (event.candidate) {
            self.signaler({
                type: 'candidate',
                data: event.candidate
            });
        }
    };
};

/* Debugging */
function onError(error) {
    console.error('Error:', JSON.stringify(error));
}