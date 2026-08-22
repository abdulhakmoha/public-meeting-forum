import { useEffect, useState } from 'react';

function sniffMime(bytes, hinted = '', name = '') {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const head = String.fromCharCode(...u8.slice(0, 8));
  if (head.startsWith('%PDF')) return 'application/pdf';
  if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return 'image/png';
  if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return 'image/jpeg';
  if (head.startsWith('GIF')) return 'image/gif';
  if (head.startsWith('RIFF') && String.fromCharCode(...u8.slice(8, 12)) === 'WEBP') return 'image/webp';

  const hay = `${hinted} ${name}`.toLowerCase();
  if (hay.includes('pdf')) return 'application/pdf';
  if (hay.includes('png')) return 'image/png';
  if (hay.includes('jpeg') || hay.includes('jpg')) return 'image/jpeg';
  if (hay.includes('gif')) return 'image/gif';
  if (hay.includes('webp')) return 'image/webp';
  if (hay.includes('wordprocessingml') || hay.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (hay.includes('spreadsheetml') || hay.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (hay.includes('presentationml') || hay.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (hinted && hinted !== 'application/octet-stream') return hinted;
  return 'application/octet-stream';
}

function kindFromMime(mime) {
  if (!mime) return 'unknown';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.startsWith('text/')) return 'text';
  if (
    mime.includes('officedocument') ||
    mime.includes('msword') ||
    mime.includes('ms-excel') ||
    mime.includes('ms-powerpoint')
  ) {
    return 'doc';
  }
  return 'unknown';
}

function withInlineFlag(url) {
  if (!url) return url;
  const u = new URL(url, window.location.origin);
  u.searchParams.set('inline', '1');
  return u.toString();
}

export default function FileOpenViewer({ url, mime = '', name = '', title = '' }) {
  const [status, setStatus] = useState('loading');
  const [blobUrl, setBlobUrl] = useState('');
  const [kind, setKind] = useState('unknown');
  const [error, setError] = useState('');

  useEffect(() => {
    let revoked = '';
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setError('');
      if (!url) {
        setStatus('error');
        setError('File URL is missing');
        return;
      }
      try {
        const res = await fetch(withInlineFlag(url), { credentials: 'omit', cache: 'reload' });
        if (!res.ok) throw new Error(`Could not load file (${res.status})`);
        const buf = await res.arrayBuffer();
        const detected = sniffMime(new Uint8Array(buf.slice(0, 32)), res.headers.get('content-type') || mime, name || title);
        const k = kindFromMime(detected);
        const blob = new Blob([buf], { type: detected });
        const obj = URL.createObjectURL(blob);
        revoked = obj;
        if (cancelled) {
          URL.revokeObjectURL(obj);
          return;
        }
        setKind(k);
        setBlobUrl(obj);
        setStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(e.message || 'Could not open file');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [url, mime, name, title]);

  if (status === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-slate-500">
        Loading file…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-red-500 px-6 text-center">
        {error}
      </div>
    );
  }

  if (kind === 'image') {
    return <img src={blobUrl} alt="" className="w-full h-full object-contain bg-slate-100 dark:bg-slate-950" />;
  }

  if (kind === 'doc') {
    const src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(withInlineFlag(url))}`;
    return <iframe src={src} className="w-full h-full border-0" title="Office preview" />;
  }

  return (
    <iframe
      src={blobUrl}
      className="w-full h-full border-0 bg-white"
      title="File preview"
    />
  );
}

export function openBlobInNewTab(url, mime = '', name = '') {
  return fetch(withInlineFlag(url), { credentials: 'omit', cache: 'reload' })
    .then(async (res) => {
      if (!res.ok) throw new Error('Could not open file');
      const buf = await res.arrayBuffer();
      const detected = sniffMime(new Uint8Array(buf.slice(0, 32)), res.headers.get('content-type') || mime, name);
      const blob = new Blob([buf], { type: detected || 'application/pdf' });
      const obj = URL.createObjectURL(blob);
      const w = window.open(obj, '_blank', 'noopener,noreferrer');
      if (!w) {
        URL.revokeObjectURL(obj);
        throw new Error('Popup blocked — allow popups to open the file');
      }
    });
}

export function downloadHref(url) {
  if (!url) return url;
  const u = new URL(url, window.location.origin);
  u.searchParams.set('download', '1');
  u.searchParams.set('inline', '1');
  return u.toString();
}
