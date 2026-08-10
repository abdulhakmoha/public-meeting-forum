import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Runtime API host config.
class ApiConfig {
  ApiConfig._();
  static final ApiConfig instance = ApiConfig._();

  static const String _prefsKey = 'api_origin';
  static const int port = 5001;
  static const String productionOrigin = 'https://public-meeting-forum.onrender.com';
  static const String defaultOrigin = productionOrigin;

  /// Override with `--dart-define=API_ORIGIN=http://x.x.x.x:5001` for local/LAN.
  static const String lanOrigin = String.fromEnvironment(
    'API_ORIGIN',
    defaultValue: productionOrigin,
  );

  String _origin = defaultOrigin;
  bool _ready = false;

  String get origin => _origin;
  String get apiBaseUrl => '$_origin/api';
  bool get isReady => _ready;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefsKey);

    // Drop stale LAN/localhost saves so release APK always uses production cloud API
    final usingProductionDefault = defaultOrigin.contains('onrender.com');
    if (usingProductionDefault &&
        saved != null &&
        saved.isNotEmpty &&
        !saved.contains('onrender.com')) {
      await prefs.remove(_prefsKey);
    }

    final freshSaved = prefs.getString(_prefsKey);

    final candidates = <String>[
      if (lanOrigin.isNotEmpty) _normalizeOrigin(lanOrigin),
      defaultOrigin,
      if (freshSaved != null && freshSaved.isNotEmpty) _normalizeOrigin(freshSaved),
    ];

    // Only probe local backends when explicitly developing (dart-define override)
    final isLocalOverride = lanOrigin.contains('127.0.0.1') ||
        lanOrigin.contains('localhost') ||
        lanOrigin.contains('192.168.') ||
        lanOrigin.contains('10.');
    if (isLocalOverride) {
      candidates.addAll([
        'http://127.0.0.1:$port',
        'http://10.0.2.2:$port',
      ]);
    }

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

    // Always fall back to production for release builds
    _origin = _normalizeOrigin(
      unique.isNotEmpty ? unique.first : defaultOrigin,
    );
    await prefs.setString(_prefsKey, _origin);
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
          .timeout(const Duration(seconds: 8));
      return res.statusCode == 200 &&
          res.body.toLowerCase().contains('pmcfms');
    } catch (_) {
      return false;
    }
  }
}
