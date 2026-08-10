const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    console.log('--- MOCK EMAIL (SMTP not fully configured on server) ---');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Set SMTP_HOST, SMTP_EMAIL, SMTP_PASSWORD on Render for real Gmail.');
    console.log('-------------------------------------------------------');
    return { success: true, mocked: true };
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const fromEmail = process.env.FROM_EMAIL || user;
  const fromName = process.env.FROM_NAME || 'PMCFMS Support';

  // Gmail: use App Password (not normal login password) + FROM must match SMTP_EMAIL
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });
    console.log(`Email OK → ${options.email} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Email FAIL → ${options.email}:`, err.message);
    throw err;
  }
};

module.exports = sendEmail;
