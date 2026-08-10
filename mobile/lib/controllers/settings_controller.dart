import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'notification_controller.dart';

class SettingsController extends GetxController {
  static const _notifKey = 'notifications';
  static const _darkKey = 'darkMode';

  final notificationsEnabled = true.obs;
  final darkMode = false.obs;
  var isReady = false.obs;

  @override
  void onInit() {
    super.onInit();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    notificationsEnabled.value = prefs.getBool(_notifKey) ?? true;
    darkMode.value = prefs.getBool(_darkKey) ?? false;
    _applyTheme(darkMode.value, persist: false);
    isReady.value = true;
  }

  Future<void> setNotifications(bool enabled) async {
    notificationsEnabled.value = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_notifKey, enabled);

    if (Get.isRegistered<NotificationController>()) {
      final notif = Get.find<NotificationController>();
      if (enabled) {
        await notif.fetchNotifications();
      } else {
        notif.notifications.clear();
        notif.hasUnread.value = false;
      }
    }
  }

  Future<void> setDarkMode(bool enabled) async {
    darkMode.value = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_darkKey, enabled);
    _applyTheme(enabled, persist: true);
  }

  void _applyTheme(bool enabled, {required bool persist}) {
    Get.changeThemeMode(enabled ? ThemeMode.dark : ThemeMode.light);
    // Rebuild screens that use AppTheme.* color getters
    Get.forceAppUpdate();
  }
}
