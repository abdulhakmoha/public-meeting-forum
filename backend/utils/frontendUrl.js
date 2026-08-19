const DEFAULT_WEB = 'https://public-meeting-forum.vercel.app';

/**
 * Always send password-reset users to the public website (browser),
 * never the Render API host or a mobile deep link.
 */
function getFrontendOrigin() {
  let raw = String(process.env.FRONTEND_URL || DEFAULT_WEB).trim().replace(/\/$/, '');
  if (!raw) return DEFAULT_WEB;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (
      host.includes('onrender.com') ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      u.pathname.startsWith('/api')
    ) {
      return DEFAULT_WEB;
    }
    return `${u.protocol}//${u.host}`;
  } catch {
    return DEFAULT_WEB;
  }
}

function getResetPasswordUrl(token) {
  return `${getFrontendOrigin()}/reset-password/${encodeURIComponent(token)}`;
}

module.exports = { getFrontendOrigin, getResetPasswordUrl, DEFAULT_WEB };
