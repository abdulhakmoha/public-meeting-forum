/**
 * Tabaarak ICT SMS (Somalia)
 * Auth: POST /Auth/SMSLogin → Bearer token
 * Send: POST /Sms/sendsms
 */
const axios = require('axios');

const TABAARAK_BASE = 'https://sms.tabaarak.com';

function normalizeMobile(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  // 25261xxxxxxx → 61xxxxxxx (Tabaarak examples use 61…)
  if (p.startsWith('252')) p = p.slice(3);
  if (p.startsWith('0')) p = p.slice(1);
  return p;
}

async function getTabaarakToken() {
  const name = process.env.TABAARAK_SMS_USER || process.env.SOMALI_SMS_USER;
  const password = process.env.TABAARAK_SMS_PASS || process.env.SOMALI_SMS_PASS;

  if (!name || !password) return null;

  const res = await axios.post(
    `${TABAARAK_BASE}/Auth/SMSLogin`,
    { Name: name, Password: password },
    { timeout: 20000 }
  );

  const token = res.data?.data?.token || res.data?.token;
  if (!token) {
    throw new Error('Tabaarak login succeeded but no token in response');
  }
  return token;
}

function isSmsConfigured() {
  const name = process.env.TABAARAK_SMS_USER || process.env.SOMALI_SMS_USER;
  const password = process.env.TABAARAK_SMS_PASS || process.env.SOMALI_SMS_PASS;
  return !!(name && password);
}

const sendSMS = async (phoneNumber, message) => {
  const name = process.env.TABAARAK_SMS_USER || process.env.SOMALI_SMS_USER;
  const password = process.env.TABAARAK_SMS_PASS || process.env.SOMALI_SMS_PASS;

  if (!name || !password) {
    console.log('--- MOCK SMS (no Tabaarak credentials) ---');
    console.log(`To: ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log('------------------------------------------');
    return { success: true, message: 'Mock SMS logged to console' };
  }

  try {
    const token = await getTabaarakToken();
    const mobile = normalizeMobile(phoneNumber);

    const response = await axios.post(
      `${TABAARAK_BASE}/Sms/sendsms`,
      {
        smsMessage: message,
        mobile: [mobile],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      }
    );

    console.log('Tabaarak SMS response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('Tabaarak SMS Error:', detail);
    return { success: false, error: detail };
  }
};

module.exports = sendSMS;
module.exports.isConfigured = isSmsConfigured;
