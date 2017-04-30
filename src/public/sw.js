self.addEventListener('install', (event) => {
    console.log('Installing service worker');
});

self.addEventListener('activate', (event) => {
    console.log('Service worker now active');
});

self.addEventListener('fetch', (event) => {
    console.log('Fetch received:', JSON.stringify(event));
});