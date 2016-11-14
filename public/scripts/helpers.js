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

    return {
        isServiceWorkerSupported: isServiceWorkerSupported,
        isWebSocketSupported: isWebSocketSupported,
        isWebRTCSupported: isWebRTCSupported,
        tryParseJSON: tryParseJSON
    };

}());