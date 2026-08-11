// Build absolute media URLs for /uploads/... files.
// VITE_API_URL is often `https://host/api` or `/api` — strip trailing `/api` for media.
export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const raw = import.meta.env.VITE_API_URL || '';
  let origin = '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    origin = raw.replace(/\/api\/?$/, '');
  } else if (typeof window !== 'undefined') {
    origin = window.location.origin;
  }

  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}
