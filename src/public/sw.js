var soundCloudAPIBase = 'https://api.soundcloud.com';

self.addEventListener('install', function (event) {
    console.log('Installing service worker');
});

self.addEventListener('activate', function (event) {
    console.log('Service worker now active');
});

self.addEventListener('fetch', function (event) {
    console.log('Fetch received:', JSON.stringify(event));
});