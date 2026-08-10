// Build URLs for static files under backend `/uploads/...`
// VITE_API_URL is often `http://host:5001/api` — strip trailing `/api` for media.
function mediaBase() {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  return String(raw).replace(/\/api\/?$/, '');
}

export const mediaUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) {
    try {
      const u = new URL(path);
      if (u.pathname.includes('/uploads/')) return `${mediaBase()}${u.pathname}`;
    } catch (_) { /* keep as-is */ }
    return path;
  }
  let p = path.startsWith('/') ? path : `/${path}`;
  if (p.startsWith('/api/uploads/')) p = p.slice(4);
  return `${mediaBase()}${p}`;
};
