/** Classify project/main upload for preview + cards (web + shared logic). */
export function fileKind(url, mime = '', name = '') {
  const hay = `${url || ''} ${name || ''}`.toLowerCase();
  const m = (mime || '').toLowerCase();

  if (m.includes('pdf') || /\.pdf(\?|#|$)/i.test(hay)) return 'pdf';
  if (
    m.startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|bmp)(\?|#|$)/i.test(hay)
  ) {
    return 'image';
  }
  if (
    /\.(docx?|pptx?|xlsx?|txt|csv)(\?|#|$)/i.test(hay) ||
    m.includes('officedocument') ||
    m.includes('msword') ||
    m.includes('ms-excel') ||
    m.includes('ms-powerpoint') ||
    m.includes('text/')
  ) {
    return 'doc';
  }
  // Uploaded asset that is not a clear image → treat as document (avoid broken <img>)
  if ((url || '').includes('/uploads/')) return 'doc';
  return 'unknown';
}

export function isPdfFile(url, mime = '', name = '') {
  return fileKind(url, mime, name) === 'pdf';
}

export function isImageFile(url, mime = '', name = '') {
  return fileKind(url, mime, name) === 'image';
}
