const dns = require('dns');
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

function smtpConfig() {
  const host = cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com';
  const user = cleanEnv(process.env.SMTP_EMAIL);
  const pass = cleanEnv(process.env.SMTP_PASSWORD).replace(/\s/g, '');
  const port = Number(cleanEnv(process.env.SMTP_PORT) || 587);
  const fromEmail = cleanEnv(process.env.FROM_EMAIL) || user;
  const fromName = cleanEnv(process.env.FROM_NAME) || 'PMCFMS Support';
  return { host, user, pass, port, fromEmail, fromName };
}

function isSmtpConfigured() {
  const { user, pass } = smtpConfig();
  return !!(user && pass);
}

function createTransporter(port) {
  const { host, user, pass } = smtpConfig();
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

let transporter;
let verified = false;
let lastError = '';

function getTransporter() {
  if (transporter) return transporter;
  const { port } = smtpConfig();
  transporter = createTransporter(port === 465 ? 465 : 587);
  return transporter;
}

async function verifySmtp() {
  if (!isSmtpConfigured()) {
    lastError = 'SMTP_EMAIL or SMTP_PASSWORD missing';
    console.warn('⚠️ SMTP not fully set (need SMTP_EMAIL, SMTP_PASSWORD)');
    return false;
  }

  const ports = smtpConfig().port === 465 ? [465, 587] : [587, 465];
  for (const port of ports) {
    try {
      transporter = createTransporter(port);
      await transporter.verify();
      verified = true;
      lastError = '';
      const { user } = smtpConfig();
      console.log(`✅ Gmail SMTP ready (${user}) on port ${port}`);
      return true;
    } catch (err) {
      lastError = err.message || String(err);
      console.error(`❌ Gmail SMTP port ${port} failed:`, lastError);
      transporter = null;
      verified = false;
    }
  }
  console.error('Use a Gmail App Password (16 letters), not the normal Gmail password.');
  return false;
}

const sendEmail = async (options) => {
  if (!isSmtpConfigured()) {
    console.log('--- MOCK EMAIL (SMTP not fully configured on server) ---');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Set SMTP_HOST, SMTP_EMAIL, SMTP_PASSWORD on Render for real Gmail.');
    console.log('-------------------------------------------------------');
    return { success: true, mocked: true };
  }

  const { fromName, user } = smtpConfig();
  const from = `"${fromName}" <${user}>`;

  try {
    if (!verified) {
      const ok = await verifySmtp();
      if (!ok) {
        const err = new Error(lastError || 'Gmail SMTP login failed');
        err.code = 'EAUTH';
        throw err;
      }
    }
    const info = await getTransporter().sendMail({
      from,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });
    console.log(`Email OK → ${options.email} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    transporter = null;
    verified = false;
    lastError = err.message || String(err);
    console.error(`Email FAIL → ${options.email}:`, lastError);
    throw err;
  }
};

sendEmail.isSmtpConfigured = isSmtpConfigured;
sendEmail.verifySmtp = verifySmtp;
sendEmail.lastError = () => lastError;

module.exports = sendEmail;
