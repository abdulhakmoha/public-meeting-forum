import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Survives Android restart when picking a file for document upload.
class DocumentDraftStore {
  static const _draftKey = 'document_upload_draft_v1';
  static const _resumeKey = 'document_upload_resume_v1';
  static const _stagedKey = 'document_staged_files_v1';

  static Future<void> save({
    required String title,
    required String description,
    required String category,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _draftKey,
      jsonEncode({
        'title': title,
        'description': description,
        'category': category,
      }),
    );
  }

  static Future<Map<String, dynamic>?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_draftKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {
      return null;
    }
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_draftKey);
    await prefs.remove(_resumeKey);
    await prefs.remove(_stagedKey);
    await _clearManifest();
  }

  static Future<void> markResume() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('forum_create_resume_v1', false);
    await prefs.setBool('project_create_resume_v1', false);
    await prefs.setBool(_resumeKey, true);
  }

  static Future<bool> consumeResume() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    final need = prefs.getBool(_resumeKey) ?? false;
    if (need) await prefs.setBool(_resumeKey, false);
    return need;
  }

  static List<Map<String, String>> _parseStaged(String? raw) {
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => Map<String, String>.from(
                (e as Map).map((k, v) => MapEntry(k.toString(), v.toString())),
              ))
          .where((m) => (m['path'] ?? '').isNotEmpty)
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<File> _manifestFile() async {
    final support = await getApplicationSupportDirectory();
    return File('${support.path}/doc_staged/manifest.json');
  }

  static Future<List<Map<String, String>>> _readManifest() async {
    try {
      final file = await _manifestFile();
      if (!await file.exists()) return [];
      return _parseStaged(await file.readAsString());
    } catch (_) {
      return [];
    }
  }

  static Future<void> _clearManifest() async {
    try {
      final file = await _manifestFile();
      if (await file.exists()) await file.delete();
    } catch (_) {}
  }

  static Future<List<Map<String, String>>> peekStagedFiles() async {
    final fromFile = await _readManifest();
    if (fromFile.isNotEmpty) return fromFile;
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    return _parseStaged(prefs.getString(_stagedKey));
  }

  static Future<List<Map<String, String>>> consumeStagedFiles() async {
    final list = await peekStagedFiles();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_stagedKey);
    await _clearManifest();
    return list;
  }
}
