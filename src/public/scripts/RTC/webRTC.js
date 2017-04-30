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
WebRTCPeer.prototype.acceptOffer = function (offer, config = {}) {
    return this.peerConnection.setRemoteDescription(offer)
        .then(() => this.peerConnection.createAnswer())
        .then((answer) => this.peerConnection.setLocalDescription(answer))
        .then(() => {
            this.signaler(Object.assign(config, {
                type: 'answer',
                data: this.peerConnection.localDescription
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
    return new Promise((resolve, reject) => {
        var channel = this.peerConnection.createDataChannel(config.label, config);
        Helpers.addHandlers(channel, handlers);
        resolve(channel);
    });
};
WebRTCPeer.prototype.giveOffer = function (config = {}) {
    return new Promise((resolve, reject) => {
        this.peerConnection.onnegotiationneeded = () => {
            this.createOffer()
                .then((sdp) => this.peerConnection.setLocalDescription(sdp))
                .then(() => {
                    console.log('Offer Sent');
                    this.signaler(Object.assign(config, {
                        type: 'offer',
                        data: this.peerConnection.localDescription
                    }));
                    resolve();
                })
                .catch(reject);
        };
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.signaler({
                    type: 'candidate',
                    data: event.candidate
                });
            }
        };
    });
};
export default WebRTCPeer;