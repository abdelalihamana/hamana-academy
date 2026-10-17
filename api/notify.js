import admin from 'firebase-admin';

// 1. تهيئة فايربيز للخادم المباشر باستخدام المتغيرات التي أضفتها في Vercel
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // معالجة الفواصل في المفتاح السري ليعمل بشكل صحيح
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
    });
  } catch (error) {
    console.error('Firebase Admin Init Error:', error);
  }
}

export default async function handler(req, res) {
  // نقبل فقط طلبات الإرسال (POST)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { title, body, tokens } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'لا يوجد تلاميذ فعلوا الإشعارات' });
    }

    // 2. تجهيز الإشعار للهواتف
    const message = {
      notification: { title, body },
      tokens: tokens, 
    };

    // 3. إطلاق الإشعار!
    const response = await admin.messaging().sendEachForMulticast(message);
    return res.status(200).json({ success: true, response });
    
  } catch (error) {
    console.error('Send Notification Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}