const nodemailer = require('nodemailer');

function cleanEnv(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function smtpConfig() {
  const host = cleanEnv(process.env.SMTP_HOST);
  const user = cleanEnv(process.env.SMTP_EMAIL);
  const pass = cleanEnv(process.env.SMTP_PASSWORD).replace(/\s/g, '');
  const port = Number(cleanEnv(process.env.SMTP_PORT) || 587);
  const fromEmail = cleanEnv(process.env.FROM_EMAIL) || user;
  const fromName = cleanEnv(process.env.FROM_NAME) || 'PMCFMS Support';
  return { host, user, pass, port, fromEmail, fromName };
}

function isSmtpConfigured() {
  const { host, user, pass } = smtpConfig();
  return !!(host && user && pass);
}

let transporter;
let verified = false;

function getTransporter() {
  if (transporter) return transporter;

  const { host, user, pass, port } = smtpConfig();
  const isGmail = host.includes('gmail.com') || user.endsWith('@gmail.com');

  transporter = isGmail
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
      })
    : nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: { user, pass },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
      });

  return transporter;
}

async function verifySmtp() {
  if (!isSmtpConfigured()) {
    console.warn('⚠️ SMTP not fully set (need SMTP_HOST, SMTP_EMAIL, SMTP_PASSWORD)');
    return false;
  }
  try {
    await getTransporter().verify();
    verified = true;
    const { user } = smtpConfig();
    console.log(`✅ Gmail SMTP ready (${user})`);
    return true;
  } catch (err) {
    verified = false;
    console.error('❌ Gmail SMTP login failed:', err.message);
    console.error('Use a Gmail App Password (16 letters), not the normal Gmail password.');
    return false;
  }
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

  const { fromEmail, fromName, user } = smtpConfig();
  // Gmail rejects From addresses that are not the authenticated account
  const from = `"${fromName}" <${user}>`;
  if (fromEmail && fromEmail.toLowerCase() !== user.toLowerCase()) {
    console.warn(`FROM_EMAIL (${fromEmail}) differs from SMTP_EMAIL (${user}); sending as ${user}`);
  }

  try {
    if (!verified) {
      await verifySmtp();
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
    console.error(`Email FAIL → ${options.email}:`, err.message);
    throw err;
  }
};

sendEmail.isSmtpConfigured = isSmtpConfigured;
sendEmail.verifySmtp = verifySmtp;

module.exports = sendEmail;
