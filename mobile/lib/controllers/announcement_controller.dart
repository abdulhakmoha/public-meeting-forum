import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/app_notification.dart';
import '../utils/live_poll.dart';

class AnnouncementController extends GetxController {
  var isLoading = false.obs;
  var announcements = <dynamic>[].obs;
  var isSubmitting = false.obs;

  late final VoidCallback _liveRefresh;

  @override
  void onInit() {
    super.onInit();
    _liveRefresh = () => fetchAnnouncements(quiet: true);
    LivePoll.register(_liveRefresh);
  }

  @override
  void onClose() {
    LivePoll.unregister(_liveRefresh);
    super.onClose();
  }

  Future<void> fetchAnnouncements({bool quiet = false}) async {
    try {
      if (!quiet) isLoading.value = true;
      final response = await ApiService.get('/announcements');
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        announcements.value = data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching announcements: $e');
    } finally {
      if (!quiet) isLoading.value = false;
    }
  }

  Future<bool> createAnnouncement(Map<String, dynamic> data) async {
    try {
      isSubmitting.value = true;
      final response = await ApiService.post('/announcements', data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchAnnouncements();
        return true;
      }
      AppNotification.error('Failed to create announcement');
      return false;
    } catch (e) {
      print('Error creating announcement: $e');
      AppNotification.error('Could not connect to server');
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  Future<bool> deleteAnnouncement(String id) async {
    try {
      final response = await ApiService.delete('/announcements/$id');
      if (response.statusCode == 200) {
        await fetchAnnouncements();
        AppNotification.success('Deleted', 'Announcement deleted');
        return true;
      }
      AppNotification.error('Failed to delete announcement');
      return false;
    } catch (e) {
      AppNotification.error('Could not delete announcement');
      return false;
    }
  }
}
