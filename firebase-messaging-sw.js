importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDuuYHwmSW0UV1TO3gDGyETrvOimE7iGLs",
    authDomain: "physique-58073.firebaseapp.com",
    projectId: "physique-58073",
    storageBucket: "physique-58073.firebasestorage.app",
    messagingSenderId: "744073429659",
    appId: "1:744073429659:web:0859514e70482543d13c3e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png',
        badge: '/icon.png',
        dir: 'rtl',
        // 💡 حفظ الرابط المخفي داخل الإشعار
        data: {
            url: payload.data ? payload.data.url : 'https://hamana-academy.vercel.app/'
        }
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 💡 برمجة ما يحدث عند النقر على الإشعار
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // إغلاق الإشعار من الشاشة
    const urlToOpen = event.notification.data.url || 'https://hamana-academy.vercel.app/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});
