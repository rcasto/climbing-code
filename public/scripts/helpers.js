var Helpers = (function () {

    function isServiceWorkerSupported() {
        return 'serviceWorker' in navigator && navigator['serviceWorker'];
    }

    return {
        isServiceWorkerSupported: isServiceWorkerSupported
    };

}());