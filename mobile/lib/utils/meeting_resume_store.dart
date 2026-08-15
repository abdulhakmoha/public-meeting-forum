import 'package:shared_preferences/shared_preferences.dart';

/// Survives Android Activity recreate when opening Jitsi / external video.
class MeetingResumeStore {
  static const _idKey = 'meeting_resume_id_v1';
  static const _virtualKey = 'meeting_resume_virtual_v1';

  static Future<void> save(String meetingId, {bool openVirtual = false}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_idKey, meetingId);
    await prefs.setBool(_virtualKey, openVirtual);
  }

  static Future<String?> peekId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_idKey);
  }

  static Future<bool> peekOpenVirtual() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_virtualKey) ?? false;
  }

  /// Read and clear resume flags.
  static Future<({String? id, bool openVirtual})> consume() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString(_idKey);
    final openVirtual = prefs.getBool(_virtualKey) ?? false;
    await prefs.remove(_idKey);
    await prefs.remove(_virtualKey);
    return (id: id, openVirtual: openVirtual);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_idKey);
    await prefs.remove(_virtualKey);
  }
}
