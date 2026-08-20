const axios = require('axios');

function cleanEnv(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function gasEmailConfig() {
  const url = cleanEnv(process.env.GAS_EMAIL_URL) || cleanEnv(process.env.GOOGLE_APPS_SCRIPT_EMAIL_URL);
  const secret = cleanEnv(process.env.GAS_EMAIL_SECRET) || cleanEnv(process.env.GOOGLE_APPS_SCRIPT_SECRET);
  return { url, secret };
}

function isGasEmailConfigured() {
  const { url, secret } = gasEmailConfig();
  return !!(url && secret);
}

async function sendViaGoogleAppsScript(options) {
  const { url, secret } = gasEmailConfig();
  if (!url || !secret) {
    throw new Error('Google Apps Script email not configured (GAS_EMAIL_URL, GAS_EMAIL_SECRET)');
  }

  const res = await axios.post(
    url,
    {
      secret,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message || ''}</p>`,
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      maxRedirects: 5,
    }
  );

  const data = res.data;
  if (data?.error) {
    throw new Error(String(data.error));
  }
  if (data?.success === false) {
    throw new Error(String(data.message || 'Apps Script send failed'));
  }

  console.log(`Email OK (Google Apps Script) → ${options.email}`);
  return { success: true, provider: 'google-apps-script' };
}

module.exports = {
  isGasEmailConfigured,
  sendViaGoogleAppsScript,
  gasEmailConfig,
};
