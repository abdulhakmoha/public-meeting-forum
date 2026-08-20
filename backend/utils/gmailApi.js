const axios = require('axios');

function cleanEnv(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function gmailApiConfig() {
  const clientId = cleanEnv(process.env.GMAIL_CLIENT_ID) || cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret =
    cleanEnv(process.env.GMAIL_CLIENT_SECRET) || cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  const refreshToken =
    cleanEnv(process.env.GMAIL_REFRESH_TOKEN) || cleanEnv(process.env.GOOGLE_REFRESH_TOKEN);
  const sender =
    cleanEnv(process.env.SMTP_EMAIL) || cleanEnv(process.env.FROM_EMAIL) || cleanEnv(process.env.GMAIL_SENDER);
  const fromName = cleanEnv(process.env.FROM_NAME) || 'PMCFMS Support';
  return { clientId, clientSecret, refreshToken, sender, fromName };
}

function isGmailApiConfigured() {
  const { clientId, clientSecret, refreshToken, sender } = gmailApiConfig();
  return !!(clientId && clientSecret && refreshToken && sender);
}

function encodeSubject(subject) {
  const safe = String(subject || '');
  if (/^[\x20-\x7E]*$/.test(safe)) return safe;
  return `=?UTF-8?B?${Buffer.from(safe, 'utf8').toString('base64')}?=`;
}

function buildRawMessage({ fromName, sender, to, subject, text, html }) {
  const boundary = `pmcfms_${Date.now()}`;
  const fromHeader = `"${fromName.replace(/"/g, '')}" <${sender}>`;
  const lines = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    text || '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    html || `<p>${text || ''}</p>`,
    `--${boundary}--`,
    '',
  ];
  return Buffer.from(lines.join('\r\n'), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken() {
  const { clientId, clientSecret, refreshToken } = gmailApiConfig();
  const res = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000,
    }
  );
  const token = res.data?.access_token;
  if (!token) throw new Error('Gmail API: no access token returned');
  return token;
}

async function sendViaGmailApi(options) {
  if (!isGmailApiConfigured()) {
    throw new Error('Gmail API not configured (need GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)');
  }

  const { sender, fromName } = gmailApiConfig();
  const accessToken = await getAccessToken();
  const raw = buildRawMessage({
    fromName,
    sender,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  });

  const res = await axios.post(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    { raw },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    }
  );

  console.log(`Email OK (Gmail API) → ${options.email} (${res.data?.id || 'sent'})`);
  return { success: true, messageId: res.data?.id, provider: 'gmail-api' };
}

module.exports = {
  isGmailApiConfigured,
  sendViaGmailApi,
  gmailApiConfig,
};
