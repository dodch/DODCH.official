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

// onBackgroundMessage is required for notificationclick to work correctly.
// We do NOT manually call showNotification() here because the webpush.notification
// field in our FCM payload already causes the browser to display the notification.
// Calling showNotification() here too was causing the double-notification bug.
messaging.onBackgroundMessage((payload) => {
    // Intentionally left empty — display is handled by webpush.notification in the payload.
    console.log('[SW] Background message received:', payload);
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
