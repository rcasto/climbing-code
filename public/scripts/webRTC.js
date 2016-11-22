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

    options = options || {};
    handlers = handlers || {};

    this.signaler = signaler;
    this.peerConnection = new RTCPeerConnection(options);

    this.peerConnection.onsignalingstatechange = function (event) {
        console.log('Signal state:', this.signalingState);
    };

    Helpers.addHandlers(this.peerConnection, handlers);
}
WebRTCPeer.prototype.acceptOffer = function (offer, config) {
    var self = this;
    config = config || {};
    return this.peerConnection.setRemoteDescription(offer).then(function () {
        return self.peerConnection.createAnswer();
    }).then(function (answer) {
        return self.peerConnection.setLocalDescription(answer);
    }).then(function () {
        self.signaler(Object.assign(config, {
            type: 'answer',
            data: self.peerConnection.localDescription
        }));
    });
};
WebRTCPeer.prototype.acceptAnswer = function (answer) {
    console.log('Accepting Answer');

    return this.peerConnection.setRemoteDescription(answer);
};
WebRTCPeer.prototype.acceptCandidate = function (candidate) {
    console.log('Accepting Candidate:', candidate);

    return this.peerConnection.addIceCandidate(candidate);
};
WebRTCPeer.prototype.addChannel = function (config, handlers) {
    console.log('Channel Added');
    return new Promise(function (resolve, reject) {
        var channel = this.peerConnection.createDataChannel(config.label, config);
        Helpers.addHandlers(channel, handlers);
        resolve(channel);
    }.bind(this));
};
WebRTCPeer.prototype.giveOffer = function (config) {
    var self = this;
    config = config || {};
    return new Promise(function (resolve, reject) {
        this.peerConnection.onnegotiationneeded = function () {
            this.createOffer().then(function (sdp) {
                return self.peerConnection.setLocalDescription(sdp);
            }).then(function () {
                console.log('Offer Sent');
                self.signaler(Object.assign(config, {
                    type: 'offer',
                    data: self.peerConnection.localDescription
                }));
                resolve();
            }, reject);
        };
        this.peerConnection.onicecandidate = function (event) {
            if (event.candidate) {
                self.signaler({
                    type: 'candidate',
                    data: event.candidate
                });
            }
        };
    }.bind(this));
};