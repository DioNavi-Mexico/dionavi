const ONESIGNAL_URL = 'https://onesignal.com/api/v1/notifications';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dionavi.vercel.app';

async function sendPushNotification({ title, message, url }) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!appId || !apiKey) return;

  try {
    const res = await fetch(ONESIGNAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: message },
        url: url || `${FRONTEND_URL}/staff/portal`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('OneSignal push failed:', body);
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

module.exports = { sendPushNotification };
