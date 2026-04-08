importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBTz-7xkhelFZZUgAX6Qdc_sppiRzLDfhA",
    authDomain: "dodch-96b15.firebaseapp.com",
    projectId: "dodch-96b15",
    storageBucket: "dodch-96b15.appspot.com",
    messagingSenderId: "253879203711",
    appId: "1:253879203711:web:879893218eb835e1bc0c4a",
    measurementId: "G-4WJBPKNT1H"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'New from DODCH';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'You have a new message.',
        icon: '/IMG_3352.PNG', // Standard logo
        image: payload.notification?.image || payload.data?.image || null,
        data: {
            url: payload.data?.url || '/' // Default to homepage if no URL is provided
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle clicking the notification to open the URL
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.');
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If the site is already open, focus it and navigate
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // If site is not open, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
