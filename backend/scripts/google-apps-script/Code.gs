/**
 * PMCFMS — Google Apps Script email bridge (HTTPS, works on Render free tier).
 *
 * Setup (about 5 minutes, no Google Cloud Console):
 * 1. Open https://script.google.com → New project
 * 2. Paste this entire file, replace YOUR_SECRET below
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web app URL → Render: GAS_EMAIL_URL=<that URL>
 * 5. Render: GAS_EMAIL_SECRET=<same secret as below>
 * 6. Redeploy Render
 *
 * Uses your Gmail account directly — no Brevo, no SMTP ports.
 * Free Gmail limit: ~100 emails/day via Apps Script.
 */

var EMAIL_SECRET = 'YOUR_SECRET_PICK_A_LONG_RANDOM_STRING';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (!body.secret || body.secret !== EMAIL_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    if (!body.to || !body.subject) {
      return jsonResponse({ error: 'Missing to or subject' }, 400);
    }

    GmailApp.sendEmail(body.to, body.subject, body.text || '', {
      htmlBody: body.html || body.text || '',
      name: 'PMCFMS Support',
    });

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err.message || err) }, 500);
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'PMCFMS email bridge',
    hint: 'POST JSON with secret, to, subject, text, html',
  });
}

function jsonResponse(obj, code) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  if (code && code >= 400) {
    // Apps Script Web App cannot set HTTP status; client checks body.error
  }
  return out;
}
