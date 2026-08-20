/**
 * One-time setup: get GMAIL_REFRESH_TOKEN for Render (HTTPS — works on free tier).
 *
 * Before running:
 * 1. Google Cloud Console → create project → enable "Gmail API"
 * 2. OAuth consent screen → add your Gmail as test user
 * 3. Credentials → OAuth 2.0 Client ID → Web application
 *    - Authorized redirect URI: http://localhost:3333/oauth/callback
 * 4. Add to backend/.env:
 *    GMAIL_CLIENT_ID=...
 *    GMAIL_CLIENT_SECRET=...
 *    SMTP_EMAIL=your@gmail.com
 *
 * Run: node scripts/gmail-setup.js
 * Copy the printed GMAIL_REFRESH_TOKEN into Render Environment.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');
const { URL } = require('url');
const axios = require('axios');

const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'http://localhost:3333/oauth/callback';
const scope = 'https://mail.google.com/';

if (!clientId || !clientSecret) {
  console.error('\n❌ Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to backend/.env first.\n');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

console.log('\n=== PMCFMS Gmail API setup ===\n');
console.log('1. Open this URL in your browser and sign in with the Gmail that sends PMCFMS emails:\n');
console.log(authUrl);
console.log('\n2. After you allow access, this script will print GMAIL_REFRESH_TOKEN.\n');

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:3333');
    if (url.pathname !== '/oauth/callback') {
      res.writeHead(404);
      return res.end('Not found');
    }

    const code = url.searchParams.get('code');
    const err = url.searchParams.get('error');
    if (err) {
      res.writeHead(400);
      res.end(`OAuth error: ${err}`);
      console.error('\n❌ OAuth error:', err);
      server.close();
      process.exit(1);
    }
    if (!code) {
      res.writeHead(400);
      return res.end('Missing code');
    }

    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const refresh = tokenRes.data?.refresh_token;
    if (!refresh) {
      res.writeHead(500);
      res.end('No refresh_token — revoke app access in Google Account and run again with prompt=consent.');
      console.error('\n❌ No refresh_token. Revoke PMCFMS app in Google Account → Security → Third-party access, then run again.');
      server.close();
      process.exit(1);
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2>Success!</h2><p>You can close this tab and return to the terminal.</p>');

    console.log('\n✅ Add these to Render → Environment:\n');
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${refresh}`);
    console.log(`SMTP_EMAIL=${process.env.SMTP_EMAIL || 'your@gmail.com'}`);
    console.log('\nThen redeploy Render. Email will use Gmail API (HTTPS) — no Brevo needed.\n');

    server.close();
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Token exchange failed:', e.response?.data || e.message);
    res.writeHead(500);
    res.end('Token exchange failed — see terminal.');
    server.close();
    process.exit(1);
  }
});

server.listen(3333, () => {
  console.log('Waiting for Google callback on http://localhost:3333/oauth/callback ...\n');
});
