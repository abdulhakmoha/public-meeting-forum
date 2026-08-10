import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Runtime API host config so the app does not break when Wi‑Fi IP changes.
///
/// Default is `127.0.0.1` which works with:
///   adb reverse tcp:5001 tcp:5001
/// (USB debugging → phone localhost maps to PC backend).
class ApiConfig {
  ApiConfig._();
  static final ApiConfig instance = ApiConfig._();

  static const String _prefsKey = 'api_origin';
  static const int port = 5001;
  static const String defaultOrigin = 'http://127.0.0.1:$port';

  /// PC Wi‑Fi LAN address (phone + PC on same network). Override with:
  /// `--dart-define=API_ORIGIN=http://x.x.x.x:5001`
  static const String lanOrigin = String.fromEnvironment(
    'API_ORIGIN',
    defaultValue: 'http://10.87.28.156:$port',
  );

  String _origin = defaultOrigin;
  bool _ready = false;

  String get origin => _origin;
  String get apiBaseUrl => '$_origin/api';
  bool get isReady => _ready;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefsKey);

    final candidates = <String>[
      if (saved != null && saved.isNotEmpty) _normalizeOrigin(saved),
      if (lanOrigin.isNotEmpty) _normalizeOrigin(lanOrigin),
      defaultOrigin,
      'http://10.0.2.2:$port', // Android emulator → host machine
    ];

    // De-dupe while preserving order
    final seen = <String>{};
    final unique = <String>[];
    for (final c in candidates) {
      if (seen.add(c)) unique.add(c);
    }

    for (final candidate in unique) {
      if (await _isReachable(candidate)) {
        await setOrigin(candidate, persist: true);
        _ready = true;
        return;
      }
    }

    // Prefer LAN over localhost when probes failed (typical Wi‑Fi phone case)
    if (unique.any((u) => u == _normalizeOrigin(lanOrigin))) {
      _origin = _normalizeOrigin(lanOrigin);
    } else {
      _origin = unique.isNotEmpty ? unique.first : defaultOrigin;
    }
    _ready = true;
  }

  Future<void> setOrigin(String origin, {bool persist = true}) async {
    _origin = _normalizeOrigin(origin);
    if (persist) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, _origin);
    }
  }

  Future<bool> testOrigin(String origin) => _isReachable(_normalizeOrigin(origin));

  static String _normalizeOrigin(String value) {
    var v = value.trim();
    if (v.endsWith('/')) v = v.substring(0, v.length - 1);
    if (v.endsWith('/api')) v = v.substring(0, v.length - 4);
    if (!v.startsWith('http://') && !v.startsWith('https://')) {
      v = 'http://$v';
    }
    return v;
  }

  static Future<bool> _isReachable(String origin) async {
    try {
      final res = await http
          .get(Uri.parse('$origin/'))
          .timeout(const Duration(seconds: 3));
      return res.statusCode == 200 &&
          res.body.toLowerCase().contains('pmcfms');
    } catch (_) {
      return false;
    }
  }
}
