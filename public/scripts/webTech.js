(function () {

    if (Helpers.isServiceWorkerSupported()) {
        navigator.serviceWorker.register('serviceWorker.js', {
            scope: '/'
        }).then(function (registration) {
            console.log('Service worker registered:', JSON.stringify(registration));
        }, function (error) {
            console.error('Error registering service worker', JSON.stringify(error));
        });
    }

}());