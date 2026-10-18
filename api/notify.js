import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
    });
  } catch (error) { console.error('Firebase Admin Init Error:', error); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // 💡 إضافة استخراج المتغير url
    const { title, body, tokens, url } = req.body;

    if (!tokens || tokens.length === 0) return res.status(200).json({ success: true, message: 'لا يوجد تلاميذ فعلوا الإشعارات' });

    const message = {
      notification: { title, body },
      // 💡 تمرير الرابط للهاتف
      data: { url: url || 'https://hamana-academy.vercel.app/' }, 
      tokens: tokens, 
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return res.status(200).json({ success: true, response });
    
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
