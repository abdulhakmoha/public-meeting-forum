const Notification = require('../models/Notification');
const sendEmail = require('./sendEmail');
const sendSMS = require('./sendSMS');

/**
 * Send email + SMS (+ optional in-app) to many users without failing the whole batch.
 */
async function deliverToUsers(users, { emailSubject, emailText, emailHtml, smsMessage, inApp }) {
  let emailed = 0;
  let smsed = 0;
  let inAppCreated = 0;

  for (const user of users) {
    if (inApp) {
      try {
        await Notification.create({
          recipient: user._id,
          type: inApp.type || 'system_alert',
          title: inApp.title,
          message: inApp.message,
          link: inApp.link,
        });
        inAppCreated += 1;
      } catch (err) {
        console.error(`In-app notify failed for ${user.email}:`, err.message);
      }
    }

    if (user.email && emailSubject) {
      try {
        await sendEmail({
          email: user.email,
          subject: emailSubject,
          message: typeof emailText === 'function' ? emailText(user) : emailText,
          html: typeof emailHtml === 'function' ? emailHtml(user) : emailHtml,
        });
        emailed += 1;
      } catch (err) {
        console.error(`Email failed for ${user.email}:`, err.message);
      }
    }

    if (user.phone && smsMessage) {
      try {
        const text = typeof smsMessage === 'function' ? smsMessage(user) : smsMessage;
        const result = await sendSMS(user.phone, text);
        if (result?.success !== false) smsed += 1;
      } catch (err) {
        console.error(`SMS failed for ${user.phone}:`, err.message);
      }
    }
  }

  return { emailed, smsed, inAppCreated, total: users.length };
}

module.exports = { deliverToUsers };
