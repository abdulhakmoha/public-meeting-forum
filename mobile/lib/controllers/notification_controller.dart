import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/api_constants.dart';
import '../utils/app_notification.dart';
import '../utils/live_poll.dart';
import 'settings_controller.dart';

class NotificationController extends GetxController {
  var notifications = [].obs;
  var isLoading = false.obs;
  var hasUnread = false.obs;

  int get unreadCount => notifications.where((n) => n['read'] == false).length;

  late final VoidCallback _liveRefresh;

  @override
  void onInit() {
    super.onInit();
    fetchNotifications();
    _liveRefresh = () => fetchNotifications(quiet: true);
    LivePoll.register(_liveRefresh);
  }

  @override
  void onClose() {
    LivePoll.unregister(_liveRefresh);
    super.onClose();
  }

  Future<void> fetchNotifications({bool quiet = false}) async {
    try {
      if (Get.isRegistered<SettingsController>() &&
          !Get.find<SettingsController>().notificationsEnabled.value) {
        notifications.clear();
        hasUnread.value = false;
        return;
      }
      if (!quiet) isLoading.value = true;
      final response = await ApiService.get(ApiConstants.notifications);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        notifications.value = data['data'] ?? data;
        hasUnread.value = unreadCount > 0;
      }
    } catch (e) {
      // silently fail
    } finally {
      if (!quiet) isLoading.value = false;
    }
  }

  Future<void> markAllRead() async {
    try {
      await ApiService.put('${ApiConstants.notifications}/read-all', {});
      for (var n in notifications) {
        n['read'] = true;
      }
      notifications.refresh();
      hasUnread.value = false;
    } catch (e) {
      // silently fail
    }
  }

  Future<bool> notifyMeetingAttendees(String meetingId) async {
    try {
      final response = await ApiService.post('${ApiConstants.notifications}/meeting/$meetingId', {});
      if (response.statusCode == 200) {
        AppNotification.success('Sent', 'Notifications sent to all attendees');
        return true;
      }
      return false;
    } catch (e) {
      AppNotification.error('Could not send notifications');
      return false;
    }
  }
}
