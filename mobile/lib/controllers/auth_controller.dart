import 'dart:convert';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/session_hooks.dart';
import '../utils/api_constants.dart';
import '../utils/api_config.dart';
import '../utils/app_notification.dart';

class AuthController extends GetxController {
  var isLoading = false.obs;
  var isAuthenticated = false.obs;
  var isReady = false.obs;
  var user = {}.obs;

  @override
  void onInit() {
    super.onInit();
    onApiUnauthorized = logout;
  }

  @override
  void onClose() {
    if (onApiUnauthorized == logout) {
      onApiUnauthorized = null;
    }
    super.onClose();
  }

  Future<void> checkLoginStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userDataString = prefs.getString('user');

      if (token == null || token.isEmpty || userDataString == null) {
        isAuthenticated.value = false;
        user.value = {};
        return;
      }

      // Must validate with the live API — do not open dashboard on a stale offline cache
      try {
        final response = await ApiService.get(ApiConstants.me);
        if (response.statusCode == 200 || response.statusCode == 201) {
          final body = jsonDecode(response.body);
          final me = body is Map && body['data'] is Map
              ? Map<String, dynamic>.from(body['data'] as Map)
              : Map<String, dynamic>.from(body as Map);
          user.value = me;
          await prefs.setString('user', jsonEncode(me));
          isAuthenticated.value = true;
        } else {
          await logout();
        }
      } catch (_) {
        // Cannot reach API → show login (avoids empty dashboard on wrong/old session)
        await logout();
      }
    } catch (_) {
      isAuthenticated.value = false;
      user.value = {};
    } finally {
      isReady.value = true;
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      isLoading.value = true;

      // Warm the proxied API (Render may be asleep behind Vercel)
      await _warmApi();

      final response = await ApiService.post(ApiConstants.login, {
        'email': email,
        'password': password,
      });

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);

        data.remove('token');
        await prefs.setString('user', jsonEncode(data));

        user.value = data;
        isAuthenticated.value = true;

        return true;
      } else {
        AppNotification.error(data['message'] ?? 'Login failed');
        return false;
      }
    } catch (e) {
      AppNotification.error(_connectionError(e));
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<bool> register(String name, String email, String password, String phone, String district) async {
    try {
      isLoading.value = true;
      await _warmApi();
      final response = await ApiService.post(ApiConstants.register, {
        'name': name,
        'email': email,
        'password': password,
        'phone': phone,
        'district': district,
      });

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);

        data.remove('token');
        await prefs.setString('user', jsonEncode(data));

        user.value = data;
        isAuthenticated.value = true;

        return true;
      } else {
        AppNotification.error(data['message'] ?? 'Registration failed');
        return false;
      }
    } catch (e) {
      AppNotification.error(_connectionError(e));
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> _warmApi() async {
    try {
      await ApiService.get(ApiConstants.me);
    } catch (_) {
      // 401 / timeout while waking is fine — login request follows
    }
  }

  String _connectionError(Object e) {
    final raw = e.toString();
    if (raw.contains('TimeoutException') || raw.contains('timed out')) {
      return 'Connection timed out.\nURL: ${ApiConfig.instance.origin}\nThe server may be waking up — wait 1 minute and try again.';
    }
    if (raw.contains('SocketException') || raw.contains('Failed host lookup')) {
      return 'Could not reach the server.\nURL: ${ApiConfig.instance.origin}\nCheck mobile data/Wi‑Fi and try again.';
    }
    return 'Could not connect to server.\nURL: ${ApiConfig.instance.origin}\nPlease try again.';
  }

  /// Returns `{ok: bool, message: String}`.
  Future<Map<String, String>> forgotPassword(String email) async {
    try {
      isLoading.value = true;
      await _warmApi();
      final response = await ApiService.post(ApiConstants.forgotPassword, {
        'email': email.trim().toLowerCase(),
      });
      final data = jsonDecode(response.body);
      final message = data['message']?.toString() ??
          (response.statusCode == 200
              ? 'If an account exists, a reset link was sent. Check inbox and Spam.'
              : 'Could not send reset email.');
      return {
        'ok': response.statusCode == 200 ? 'true' : 'false',
        'message': message,
      };
    } catch (e) {
      return {'ok': 'false', 'message': _connectionError(e)};
    } finally {
      isLoading.value = false;
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> profileData) async {
    try {
      isLoading.value = true;
      final response = await ApiService.put(ApiConstants.userProfile, profileData);
      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        final updatedUser = data['data'] ?? data;
        user.value = updatedUser;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user', jsonEncode(updatedUser));

        AppNotification.success('Success', 'Profile updated successfully');
        return true;
      } else {
        AppNotification.error(data['message'] ?? 'Failed to update profile');
        return false;
      }
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  void updateUserLocal(Map<String, dynamic> userData) {
    user.value = userData;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('user', jsonEncode(userData));
    });
  }

  Future<bool> uploadProfileImage(String filePath) async {
    try {
      isLoading.value = true;
      final response = await ApiService.putFormData(
        ApiConstants.userProfile,
        {},
        [MapEntry('profileImage', filePath)],
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final updatedUser = data['data'] ?? data;
        user.value = updatedUser;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user', jsonEncode(updatedUser));
        AppNotification.success('Success', 'Profile picture updated');
        return true;
      }
      return false;
    } catch (e) {
      AppNotification.error('Could not upload image');
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');

    isAuthenticated.value = false;
    user.value = {};
  }
}
