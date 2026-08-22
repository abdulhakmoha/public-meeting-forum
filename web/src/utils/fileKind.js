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
    m.startsWith('text/') ||
    /\.(txt|csv)(\?|#|$)/i.test(hay)
  ) {
    return 'text';
  }
  if (
    /\.(docx?|pptx?|xlsx?)(\?|#|$)/i.test(hay) ||
    m.includes('officedocument') ||
    m.includes('msword') ||
    m.includes('ms-excel') ||
    m.includes('ms-powerpoint')
  ) {
    return 'doc';
  }
  return 'unknown';
}

export function isPdfFile(url, mime = '', name = '') {
  return fileKind(url, mime, name) === 'pdf';
}

export function isImageFile(url, mime = '', name = '') {
  return fileKind(url, mime, name) === 'image';
}
