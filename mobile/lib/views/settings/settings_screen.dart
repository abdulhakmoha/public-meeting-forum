import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/settings_controller.dart';
import '../../services/api_service.dart';
import '../../utils/api_config.dart';
import '../../utils/api_constants.dart';
import '../../utils/app_notification.dart';
import '../../utils/theme.dart';
import '../auth/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final AuthController authController = Get.find<AuthController>();
  late final SettingsController settingsCtrl;

  @override
  void initState() {
    super.initState();
    settingsCtrl = Get.isRegistered<SettingsController>()
        ? Get.find<SettingsController>()
        : Get.put(SettingsController(), permanent: true);
  }

  @override
  Widget build(BuildContext context) {
    final user = authController.user;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
        children: [
          Container(
            padding: EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.surfaceColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      (user['name'] ?? 'U').toString().substring(0, 1).toUpperCase(),
                      style: const TextStyle(
                        fontSize: AppTheme.fontSectionTitle,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user['name'] ?? '',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: AppTheme.fontCardTitle,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        user['email'] ?? '',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontBody),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Preferences',
            style: TextStyle(
              color: AppTheme.textSubtle,
              fontSize: AppTheme.fontMeta,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          Obx(() => _buildToggle(
                'Notifications',
                Icons.notifications_outlined,
                settingsCtrl.notificationsEnabled.value,
                (v) async {
                  await settingsCtrl.setNotifications(v);
                  AppNotification.success(
                    v ? 'Notifications On' : 'Notifications Off',
                    v ? 'You will receive app notifications.' : 'In-app notifications are paused.',
                  );
                },
              )),
          Obx(() => _buildToggle(
                'Dark Mode',
                Icons.dark_mode_outlined,
                settingsCtrl.darkMode.value,
                (v) async {
                  await settingsCtrl.setDarkMode(v);
                },
              )),
          const SizedBox(height: 24),
          Text(
            'Server',
            style: TextStyle(
              color: AppTheme.textSubtle,
              fontSize: AppTheme.fontMeta,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          _buildNav('API Server', Icons.dns_outlined, () => _showServerDialog()),
          const SizedBox(height: 24),
          Text(
            'Account',
            style: TextStyle(
              color: AppTheme.textSubtle,
              fontSize: AppTheme.fontMeta,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          _buildNav('Change Password', Icons.lock_outline, () => _showChangePasswordDialog()),
          _buildNav('Privacy Policy', Icons.privacy_tip_outlined, () => _showPrivacyDialog()),
          _buildNav('Help & Support', Icons.help_outline, () => _showHelpDialog()),
          _buildNav('About', Icons.info_outline, () => _showAboutDialog()),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showSignOutDialog(),
              icon: const Icon(Icons.logout, size: 18),
              label: const Text('Sign Out'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.errorColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showServerDialog() {
    final ctrl = TextEditingController(text: ApiConfig.instance.origin);
    var testing = false;
    Get.dialog(
      StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: AppTheme.surfaceColor,
            title: Text('API Server', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'USB default: http://127.0.0.1:5001\n(requires: adb reverse tcp:5001 tcp:5001)\n\nOr use your PC Wi‑Fi IP, e.g. http://192.168.x.x:5001',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontMeta),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: ctrl,
                  decoration: _inputDecoration('http://127.0.0.1:5001'),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Get.back(), child: const Text('Cancel')),
              TextButton(
                onPressed: testing
                    ? null
                    : () async {
                        setDialogState(() => testing = true);
                        final ok = await ApiConfig.instance.testOrigin(ctrl.text);
                        setDialogState(() => testing = false);
                        Get.snackbar(
                          ok ? 'Connected' : 'Failed',
                          ok ? 'Server is reachable' : 'Could not reach that address',
                          snackPosition: SnackPosition.BOTTOM,
                        );
                      },
                child: Text(testing ? 'Testing…' : 'Test'),
              ),
              ElevatedButton(
                onPressed: () async {
                  await ApiConfig.instance.setOrigin(ctrl.text);
                  Get.back();
                  AppNotification.success('Saved', 'Using ${ApiConfig.instance.origin}');
                },
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildToggle(String label, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return Container(
      margin: EdgeInsets.only(bottom: 8),
      padding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.textSubtle, size: 22),
          SizedBox(width: 14),
          Expanded(
            child: Text(label, style: TextStyle(color: AppTheme.textPrimary, fontSize: AppTheme.fontBody)),
          ),
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeThumbColor: Colors.white,
            activeTrackColor: AppTheme.primaryColor,
          ),
        ],
      ),
    );
  }

  Widget _buildNav(String label, IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: EdgeInsets.only(bottom: 8),
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.textSubtle, size: 22),
            SizedBox(width: 14),
            Expanded(
              child: Text(label, style: TextStyle(color: AppTheme.textPrimary, fontSize: AppTheme.fontBody)),
            ),
            Icon(Icons.chevron_right, color: AppTheme.textSubtle, size: 22),
          ],
        ),
      ),
    );
  }

  void _showChangePasswordDialog() {
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    var saving = false;
    var obscure = true;

    Get.dialog(
      StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: AppTheme.surfaceColor,
            title: Text('Change Password', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
            content: SizedBox(
              width: Get.width * 0.85,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: currentCtrl,
                    obscureText: obscure,
                    decoration: _inputDecoration('Current password'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: newCtrl,
                    obscureText: obscure,
                    decoration: _inputDecoration('New password (min 6)'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: confirmCtrl,
                    obscureText: obscure,
                    decoration: _inputDecoration('Confirm new password'),
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => setDialogState(() => obscure = !obscure),
                      icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 16),
                      label: Text(obscure ? 'Show' : 'Hide'),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: saving ? null : () => Get.back(), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: saving
                    ? null
                    : () async {
                        final current = currentCtrl.text.trim();
                        final next = newCtrl.text.trim();
                        final confirm = confirmCtrl.text.trim();
                        if (current.isEmpty || next.isEmpty || confirm.isEmpty) {
                          AppNotification.error('Fill all password fields');
                          return;
                        }
                        if (next.length < 6) {
                          AppNotification.error('New password must be at least 6 characters');
                          return;
                        }
                        if (next != confirm) {
                          AppNotification.error('New passwords do not match');
                          return;
                        }
                        setDialogState(() => saving = true);
                        try {
                          final response = await ApiService.put(ApiConstants.userProfile, {
                            'currentPassword': current,
                            'newPassword': next,
                          });
                          if (response.statusCode == 200) {
                            Get.back();
                            AppNotification.success('Password Updated', 'Your password was changed successfully.');
                          } else {
                            AppNotification.error(
                              response.body.contains('incorrect')
                                  ? 'Current password is incorrect'
                                  : 'Failed to update password',
                            );
                          }
                        } catch (_) {
                          AppNotification.error('Could not connect to server');
                        } finally {
                          setDialogState(() => saving = false);
                        }
                      },
                child: Text(saving ? 'Updating…' : 'Update'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showPrivacyDialog() {
    Get.dialog(
      AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        title: Text('Privacy Policy', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Text(
            'PMCFMS collects account information (name, email, district) to provide community services.\n\n'
            '• Your posts, comments, and issue reports are visible to authorized users.\n'
            '• Uploaded files are stored securely for community use.\n'
            '• We do not sell personal data to third parties.\n'
            '• You may request account deletion by contacting an administrator.\n\n'
            'By using PMCFMS you agree to responsible community participation.',
            style: TextStyle(color: AppTheme.textSubtle, fontSize: 13, height: 1.45),
          ),
        ),
        actions: [
          ElevatedButton(onPressed: () => Get.back(), child: const Text('OK')),
        ],
      ),
    );
  }

  void _showHelpDialog() {
    Get.dialog(
      AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        title: Text('Help & Support', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Text(
            'Need help with PMCFMS?\n\n'
            '• Meetings — join public meetings from the Meetings tab\n'
            '• Forums — discuss community topics\n'
            '• Hub — announcements, documents, projects & issues\n'
            '• Settings → API Server — if the app cannot connect\n\n'
            'Support email: support@pmcfms.local\n'
            'Or contact your district administrator.',
            style: TextStyle(color: AppTheme.textSubtle, fontSize: 13, height: 1.45),
          ),
        ),
        actions: [
          ElevatedButton(onPressed: () => Get.back(), child: const Text('OK')),
        ],
      ),
    );
  }

  void _showAboutDialog() {
    Get.defaultDialog(
      title: 'PMCFMS',
      titleStyle: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
      middleText: 'Public Meeting & Community Forum Management System\nVersion 1.0.0',
      middleTextStyle: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontBody),
      backgroundColor: AppTheme.surfaceColor,
      textConfirm: 'OK',
      confirmTextColor: Colors.white,
    );
  }

  void _showSignOutDialog() {
    Get.defaultDialog(
      title: 'Sign Out',
      titleStyle: TextStyle(color: AppTheme.textPrimary),
      middleText: 'Are you sure you want to sign out?',
      middleTextStyle: TextStyle(color: AppTheme.textSubtle),
      backgroundColor: AppTheme.surfaceColor,
      textConfirm: 'Sign Out',
      textCancel: 'Cancel',
      confirmTextColor: Colors.white,
      buttonColor: AppTheme.errorColor,
      onConfirm: () async {
        await authController.logout();
        Get.offAll(() => const LoginScreen());
      },
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppTheme.textSubtle),
      filled: true,
      fillColor: AppTheme.backgroundColor,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
    );
  }
}