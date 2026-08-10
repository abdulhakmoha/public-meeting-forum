import 'dart:convert';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/api_constants.dart';

class DashboardController extends GetxController {
  var isLoading = true.obs;
  var statistics = <String, dynamic>{}.obs;
  var hasError = false.obs;

  int get totalUsers => _asInt(statistics['totalUsers']);
  int get activeMeetings => _asInt(statistics['activeMeetings']);
  int get openForums => _asInt(statistics['openForums']);
  int get totalComments => _asInt(statistics['totalComments']);

  List<Map<String, dynamic>> get recentActivity {
    final raw = statistics['recentActivity'];
    if (raw is! List) return [];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Map<String, dynamic> get analytics {
    final raw = statistics['analytics'];
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return {};
  }

  List<Map<String, dynamic>> get monthlyMeetings => _mapList(analytics['monthlyMeetings']);
  List<Map<String, dynamic>> get forumsByCategory => _mapList(analytics['forumsByCategory']);
  List<Map<String, dynamic>> get usersByDistrict => _mapList(analytics['usersByDistrict']);

  static int _asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse('$v') ?? 0;
  }

  static List<Map<String, dynamic>> _mapList(dynamic raw) {
    if (raw is! List) return [];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  @override
  void onInit() {
    super.onInit();
    fetchDashboardStats();
  }

  Future<void> fetchDashboardStats() async {
    try {
      isLoading(true);
      hasError(false);

      final response = await ApiService.get(ApiConstants.dashboard);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final payload = data['data'] ?? data;
        statistics.assignAll(Map<String, dynamic>.from(payload as Map));
      } else {
        hasError(true);
      }
    } catch (e) {
      hasError(true);
      print('Error fetching dashboard: $e');
    } finally {
      isLoading(false);
    }
  }
}
