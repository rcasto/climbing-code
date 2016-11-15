var Helpers = (function () {

    function isServiceWorkerSupported() {
        return navigator && navigator.serviceWorker;
    }

    function isWebSocketSupported() {
        return window && window.WebSocket;
    }

    function isWebRTCSupported() {
        return window && 
               window.RTCPeerConnection &&
               window.RTCSessionDescription &&
               window.RTCIceCandidate;
    }

    function tryParseJSON(json) {
        try {
            return JSON.parse(json);
        } catch(error) {
            return null;
        }
    }

    function addHandlers(target, handlers) {
        for (var handleName in handlers) {
            if (handleName in target && handlers[handleName]) {
                if (target[handleName]) {
                    var oldHandle = target[handleName];
                    target[handleName] = function () {
                        oldHandle();
                        handlers[handleName];
                    };
                } else {
                    target[handleName] = handlers[handleName];
                }
            }
        }
    }

    return {
        isServiceWorkerSupported: isServiceWorkerSupported,
        isWebSocketSupported: isWebSocketSupported,
        isWebRTCSupported: isWebRTCSupported,
        tryParseJSON: tryParseJSON,
        addHandlers: addHandlers
    };

}());