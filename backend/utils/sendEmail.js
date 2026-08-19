const dns = require('dns');
const axios = require('axios');
const nodemailer = require('nodemailer');

try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {
  // Older Node versions
}

function cleanEnv(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function mailConfig() {
  const host = cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com';
  const user = cleanEnv(process.env.SMTP_EMAIL);
  const pass = cleanEnv(process.env.SMTP_PASSWORD).replace(/\s/g, '');
  const port = Number(cleanEnv(process.env.SMTP_PORT) || 587);
  const fromEmail = cleanEnv(process.env.FROM_EMAIL) || user;
  const fromName = cleanEnv(process.env.FROM_NAME) || 'PMCFMS Support';
  const brevoKey = cleanEnv(process.env.BREVO_API_KEY);
  return { host, user, pass, port, fromEmail, fromName, brevoKey };
}

/** True when Brevo API or Gmail SMTP credentials exist. */
function isEmailConfigured() {
  const { user, pass, brevoKey } = mailConfig();
  return !!(brevoKey || (user && pass));
}

function isSmtpConfigured() {
  return isEmailConfigured();
}

function usesBrevo() {
  return !!mailConfig().brevoKey;
}

let lastError = '';
let transporter;

function createTransporter(port) {
  const { host, user, pass } = mailConfig();
  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    family: 4,
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
    tls: { minVersion: 'TLSv1.2' },
  });
}

async function sendViaBrevo(options) {
  const { brevoKey, fromEmail, fromName, user } = mailConfig();
  const senderEmail = fromEmail || user;
  if (!brevoKey || !senderEmail) {
    throw new Error('BREVO_API_KEY or sender email missing');
  }

  const res = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: fromName, email: senderEmail },
      to: [{ email: options.email }],
      subject: options.subject,
      htmlContent: options.html || `<p>${options.message || ''}</p>`,
      textContent: options.message,
    },
    {
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 25000,
    }
  );

  console.log(`Email OK (Brevo) → ${options.email} (${res.data?.messageId || 'sent'})`);
  return { success: true, messageId: res.data?.messageId, provider: 'brevo' };
}

async function sendViaSmtp(options) {
  const { fromName, user, port } = mailConfig();
  const from = `"${fromName}" <${user}>`;
  const mail = {
    from,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  const ports = port === 465 ? [465, 587] : [587, 465];
  let lastErr;

  for (const p of ports) {
    try {
      transporter = createTransporter(p);
      const info = await transporter.sendMail(mail);
      console.log(`Email OK (SMTP:${p}) → ${options.email} (${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (err) {
      lastErr = err;
      transporter = null;
    }
  }

  throw lastErr || new Error('SMTP send failed');
}

function renderSmtpBlockedMessage(err) {
  const msg = String(err?.message || err || '');
  if (
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNECTION') ||
    msg.includes('ENETUNREACH') ||
    msg.includes('ESOCKET') ||
    msg.includes('timeout')
  ) {
    return (
      'Render free tier blocks Gmail SMTP. Add BREVO_API_KEY in Render Environment ' +
      '(free at brevo.com — verify your Gmail as sender). Local dev can still use Gmail SMTP.'
    );
  }
  if (msg.includes('Invalid login') || msg.includes('EAUTH')) {
    return 'Gmail rejected the login. Use a 16-letter Gmail App Password in SMTP_PASSWORD.';
  }
  return msg || 'Email could not be sent.';
}

async function verifySmtp() {
  if (usesBrevo()) {
    console.log('✅ Email via Brevo API (HTTPS — works on Render free tier)');
    return true;
  }
  if (!mailConfig().user || !mailConfig().pass) {
    lastError = 'SMTP_EMAIL or SMTP_PASSWORD missing';
    return false;
  }
  try {
    transporter = createTransporter(587);
    await transporter.verify();
    console.log(`✅ Gmail SMTP ready (${mailConfig().user})`);
    return true;
  } catch (err) {
    lastError = renderSmtpBlockedMessage(err);
    console.error('❌ SMTP verify failed:', lastError);
    return false;
  }
}

const sendEmail = async (options) => {
  if (!isEmailConfigured()) {
    console.log('--- MOCK EMAIL (no BREVO_API_KEY or SMTP configured) ---');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    return { success: true, mocked: true };
  }

  try {
    if (usesBrevo()) {
      return await sendViaBrevo(options);
    }
    return await sendViaSmtp(options);
  } catch (err) {
    lastError = renderSmtpBlockedMessage(err);
    console.error(`Email FAIL → ${options.email}:`, lastError);
    const wrapped = new Error(lastError);
    wrapped.code = err.code;
    throw wrapped;
  }
};

sendEmail.isSmtpConfigured = isSmtpConfigured;
sendEmail.isEmailConfigured = isEmailConfigured;
sendEmail.verifySmtp = verifySmtp;
sendEmail.lastError = () => lastError;
sendEmail.usesBrevo = usesBrevo;

module.exports = sendEmail;
