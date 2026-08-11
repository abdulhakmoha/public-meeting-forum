import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Production API goes through **Vercel** (not Render directly).
/// Phone → vercel.app/api → Render (server-side).
class ApiConfig {
  ApiConfig._();
  static final ApiConfig instance = ApiConfig._();

  static const String _prefsKey = 'api_origin';
  static const int port = 5001;

  static const String productionOrigin = 'https://public-meeting-forum.vercel.app';
  static const String defaultOrigin = productionOrigin;

  /// Local only: `--dart-define=API_ORIGIN=http://192.168.x.x:5001`
  static const String lanOrigin = String.fromEnvironment(
    'API_ORIGIN',
    defaultValue: productionOrigin,
  );

  String _origin = defaultOrigin;
  bool _ready = false;

  String get origin => _origin;
  String get apiBaseUrl => '$_origin/api';
  bool get isReady => _ready;

  bool get _isLocalDev {
    final v = lanOrigin;
    return v.contains('127.0.0.1') ||
        v.contains('localhost') ||
        v.contains('192.168.') ||
        v.contains('10.0.2.2') ||
        RegExp(r'https?://10\.\d+\.').hasMatch(v);
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    if (_isLocalDev) {
      _origin = _normalizeOrigin(lanOrigin);
      await prefs.setString(_prefsKey, _origin);
      _ready = true;
      return;
    }

    // Release: always force Vercel proxy — wipe old onrender.com / LAN saves
    _origin = productionOrigin;
    await prefs.setString(_prefsKey, productionOrigin);
    _ready = true;
  }

  Future<void> setOrigin(String origin, {bool persist = true}) async {
    _origin = _normalizeOrigin(origin);
    if (persist) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, _origin);
    }
  }

  Future<bool> testOrigin(String origin) async {
    try {
      final res = await http
          .get(Uri.parse('${_normalizeOrigin(origin)}/'))
          .timeout(const Duration(seconds: 12));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static String _normalizeOrigin(String value) {
    var v = value.trim();
    if (v.endsWith('/')) v = v.substring(0, v.length - 1);
    if (v.endsWith('/api')) v = v.substring(0, v.length - 4);
    if (!v.startsWith('http://') && !v.startsWith('https://')) {
      v = 'http://$v';
    }
    return v;
  }
}
