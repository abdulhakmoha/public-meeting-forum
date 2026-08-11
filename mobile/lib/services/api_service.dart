import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/api_constants.dart';
import 'session_hooks.dart';

class ApiService {
  /// Last upload failure message (for UI). Clears auth only on HTTP 401.
  static String? lastUploadError;
  static bool _handling401 = false;

  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');

    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<String?> _authToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static bool _isAuthRoute(String endpoint) {
    return endpoint.contains('/auth/login') || endpoint.contains('/auth/register');
  }

  static Future<void> _handleUnauthorized(String endpoint) async {
    if (_isAuthRoute(endpoint) || _handling401) return;
    _handling401 = true;
    try {
      final handler = onApiUnauthorized;
      if (handler != null) {
        await handler();
      } else {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove('token');
        await prefs.remove('user');
      }
    } catch (_) {
    } finally {
      _handling401 = false;
    }
  }

  static Future<http.Response> _maybeLogoutOn401(String endpoint, http.Response response) async {
    if (response.statusCode == 401) {
      await _handleUnauthorized(endpoint);
    }
    return response;
  }

  static Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final response = await http
        .post(
          Uri.parse('${ApiConstants.baseUrl}$endpoint'),
          headers: headers,
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 120));
    return _maybeLogoutOn401(endpoint, response);
  }

  static Future<http.Response> get(String endpoint) async {
    final headers = await _getHeaders();
    final response = await http
        .get(
          Uri.parse('${ApiConstants.baseUrl}$endpoint'),
          headers: headers,
        )
        .timeout(const Duration(seconds: 120));
    return _maybeLogoutOn401(endpoint, response);
  }

  static Future<http.Response> put(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final response = await http
        .put(
          Uri.parse('${ApiConstants.baseUrl}$endpoint'),
          headers: headers,
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 120));
    return _maybeLogoutOn401(endpoint, response);
  }

  static Future<http.Response> delete(String endpoint) async {
    final headers = await _getHeaders();
    final response = await http
        .delete(
          Uri.parse('${ApiConstants.baseUrl}$endpoint'),
          headers: headers,
        )
        .timeout(const Duration(seconds: 30));
    return _maybeLogoutOn401(endpoint, response);
  }

  static Future<http.Response> uploadFile(String endpoint, String filePath, String fieldName) async {
    final token = await _authToken();

    var request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConstants.baseUrl}$endpoint'),
    );
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(await http.MultipartFile.fromPath(fieldName, filePath));

    var streamedResponse = await request.send().timeout(const Duration(seconds: 90));
    final response = await http.Response.fromStream(streamedResponse);
    return _maybeLogoutOn401(endpoint, response);
  }

  static Future<http.Response> postFormData(
    String endpoint,
    Map<String, String> fields, [
    List<MapEntry<String, String>>? files,
  ]) async {
    final token = await _authToken();

    var request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConstants.baseUrl}$endpoint'),
    );
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields.addAll(fields);
    if (files != null) {
      for (var file in files) {
        request.files.add(await http.MultipartFile.fromPath(file.key, file.value));
      }
    }

    var streamedResponse = await request.send().timeout(const Duration(seconds: 90));
    final response = await http.Response.fromStream(streamedResponse);
    return _maybeLogoutOn401(endpoint, response);
  }

  /// Upload any [PlatformFile]. Uses path when available, otherwise bytes (`withData: true`).
  static Future<String?> uploadPlatformFile(PlatformFile file) async {
    lastUploadError = null;
    try {
      final token = await _authToken();
      if (token == null || token.isEmpty) {
        lastUploadError = 'Not signed in — please log in again';
        return null;
      }

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.upload}'),
      );
      request.headers['Authorization'] = 'Bearer $token';

      if (file.path != null && file.path!.isNotEmpty) {
        request.files.add(await http.MultipartFile.fromPath(
          'file',
          file.path!,
          filename: file.name,
        ));
      } else if (file.bytes != null) {
        request.files.add(http.MultipartFile.fromBytes(
          'file',
          file.bytes!,
          filename: file.name,
        ));
      } else {
        lastUploadError = 'Could not read file bytes. Try another file.';
        return null;
      }

      final streamed = await request.send().timeout(const Duration(seconds: 90));
      final response = await http.Response.fromStream(streamed);
      await _maybeLogoutOn401(ApiConstants.upload, response);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data['fileUrl'] as String?;
      }

      String msg = 'Upload failed (${response.statusCode})';
      try {
        final body = jsonDecode(response.body);
        if (body is Map && body['message'] != null) msg = body['message'].toString();
      } catch (_) {}
      if (response.statusCode == 413) {
        msg = 'File too large (max 25MB)';
      }
      lastUploadError = msg;
      return null;
    } catch (e) {
      lastUploadError = 'Upload error: $e';
      return null;
    }
  }

  /// Upload a file already on disk (e.g. native-staged forum attachment).
  static Future<String?> uploadLocalPath(String filePath, {String? filename}) async {
    lastUploadError = null;
    try {
      final token = await _authToken();
      if (token == null || token.isEmpty) {
        lastUploadError = 'Not signed in — please log in again';
        return null;
      }

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.upload}'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.files.add(await http.MultipartFile.fromPath(
        'file',
        filePath,
        filename: filename ?? filePath.split(RegExp(r'[\\/]')).last,
      ));

      final streamed = await request.send().timeout(const Duration(seconds: 90));
      final response = await http.Response.fromStream(streamed);
      await _maybeLogoutOn401(ApiConstants.upload, response);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data['fileUrl'] as String?;
      }

      String msg = 'Upload failed (${response.statusCode})';
      try {
        final body = jsonDecode(response.body);
        if (body is Map && body['message'] != null) msg = body['message'].toString();
      } catch (_) {}
      lastUploadError = msg;
      return null;
    } catch (e) {
      lastUploadError = 'Upload error: $e';
      return null;
    }
  }

  static Future<http.Response> putFormData(
    String endpoint,
    Map<String, String> fields, [
    List<MapEntry<String, String>>? files,
  ]) async {
    final token = await _authToken();

    var request = http.MultipartRequest(
      'PUT',
      Uri.parse('${ApiConstants.baseUrl}$endpoint'),
    );
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields.addAll(fields);
    if (files != null) {
      for (var file in files) {
        request.files.add(await http.MultipartFile.fromPath(file.key, file.value));
      }
    }

    var streamedResponse = await request.send().timeout(const Duration(seconds: 90));
    final response = await http.Response.fromStream(streamedResponse);
    return _maybeLogoutOn401(endpoint, response);
  }
}
