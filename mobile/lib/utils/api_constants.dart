import 'api_config.dart';

class ApiConstants {
  /// Dynamic — resolves via [ApiConfig] (USB reverse / saved host).
  static String get baseUrl => ApiConfig.instance.apiBaseUrl;

  /// Backend origin without `/api` (for `/uploads/...` media).
  static String get mediaBase => ApiConfig.instance.origin;

  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';

  // Users
  static const String users = '/users';
  static const String userProfile = '/users/profile';

  // Meetings
  static const String meetings = '/meetings';

  // Forums
  static const String forums = '/forums';

  // Dashboard
  static const String dashboard = '/dashboard/stats';

  // Polls
  static const String polls = '/polls';

  // Announcements
  static const String announcements = '/announcements';

  // Documents
  static const String documents = '/documents';

  // Projects
  static const String projects = '/projects';

  // Issues
  static const String issues = '/issues';

  // Notifications
  static const String notifications = '/notifications';

  // Search
  static const String quickSearch = '/quick-search';

  // Upload
  static const String upload = '/upload';

  /// Build a full media URL from a relative `/uploads/...` path.
  /// Always uses [mediaBase] (no `/api`) so static files resolve correctly.
  static String mediaUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      final uri = Uri.tryParse(path);
      if (uri != null && uri.path.contains('/uploads/')) {
        return '$mediaBase${uri.path}';
      }
      return path;
    }
    var p = path.startsWith('/') ? path : '/$path';
    // Guard against accidental `/api/uploads/...`
    if (p.startsWith('/api/uploads/')) {
      p = p.substring(4);
    }
    return '$mediaBase$p';
  }
}
