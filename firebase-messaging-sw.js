// استدعاء مكتبات فايربيز الخاصة بالخلفية (Background)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// بيانات الاتصال بقاعدة بياناتك (أكاديمية حمانة)
firebase.initializeApp({
    apiKey: "AIzaSyDuuYHwmSW0UV1TO3gDGyETrvOimE7iGLs",
    authDomain: "physique-58073.firebaseapp.com",
    projectId: "physique-58073",
    storageBucket: "physique-58073.firebasestorage.app",
    messagingSenderId: "744073429659",
    appId: "1:744073429659:web:0859514e70482543d13c3e"
});

// تفعيل نظام المراسلة
const messaging = firebase.messaging();

// هذه الدالة تعمل عندما يكون الموقع مغلقاً أو في الخلفية
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] تلقي إشعار في الخلفية ', payload);
    
    // شكل وتصميم الإشعار الذي سيظهر على شاشة الهاتف
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png', // أيقونة منصتك
        badge: '/icon.png', // أيقونة صغيرة تظهر في شريط الإشعارات
        dir: 'rtl' // لدعم اللغة العربية
    };

    // إظهار الإشعار الفعلي
    self.registration.showNotification(notificationTitle, notificationOptions);
});
