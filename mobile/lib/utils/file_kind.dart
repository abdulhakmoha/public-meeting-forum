/// Shared file-kind helpers (keep in sync with web/src/utils/fileKind.js).

String _hay(String? url, String? mime, String? name) =>
    '${url ?? ''} ${name ?? ''}'.toLowerCase();

String fileKind(String? url, {String? mime, String? name}) {
  final hay = _hay(url, mime, name);
  final m = (mime ?? '').toLowerCase();

  if (m.contains('pdf') || RegExp(r'\.pdf(\?|#|$)').hasMatch(hay)) {
    return 'pdf';
  }
  if (m.startsWith('image/') ||
      RegExp(r'\.(jpe?g|png|gif|webp|bmp)(\?|#|$)').hasMatch(hay)) {
    return 'image';
  }
  if (RegExp(r'\.(docx?|pptx?|xlsx?|txt|csv)(\?|#|$)').hasMatch(hay) ||
      m.contains('officedocument') ||
      m.contains('msword') ||
      m.contains('ms-excel') ||
      m.contains('ms-powerpoint') ||
      m.contains('text/')) {
    return 'doc';
  }
  if ((url ?? '').contains('/uploads/')) return 'doc';
  return 'unknown';
}

bool isPdfFile(String? url, {String? mime, String? name}) =>
    fileKind(url, mime: mime, name: name) == 'pdf';

bool isImageFile(String? url, {String? mime, String? name}) =>
    fileKind(url, mime: mime, name: name) == 'image';
