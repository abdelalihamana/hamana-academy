const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // معالجة فواصل الأسطر في المفتاح السري لتجنب أي خطأ
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
    });
  } catch (error) { console.error('Firebase Admin Init Error:', error); }
}

module.exports = async function handler(req, res) {
  // السماح بطلبات الإرسال (POST) فقط
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { title, body, tokens, url } = req.body;

    if (!tokens || tokens.length === 0) {
        return res.status(200).json({ success: true, message: 'لا يوجد تلاميذ فعلوا الإشعارات' });
    }

    const message = {
      notification: { title, body },
      data: { url: url || 'https://hamana-academy.vercel.app/' }, 
      tokens: tokens, 
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return res.status(200).json({ success: true, response });
    
  } catch (error) {
    console.error('Notification Send Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
