import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/api_constants.dart';
import '../../utils/theme.dart';
import '../auth/login_screen.dart';
import 'profile_edit_screen.dart';

class ProfileScreen extends StatelessWidget {
  ProfileScreen({super.key});

  final AuthController authController = Get.find<AuthController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: AppTheme.primaryColor),
            onPressed: () => Get.to(() => const ProfileEditScreen()),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppTheme.errorColor),
            onPressed: () {
              Get.defaultDialog(
                title: 'Sign Out',
                titleStyle: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
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
            },
          )
        ],
      ),
      body: Obx(() {
        final user = authController.user;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.5), width: 2),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(45),
                  child: () {
                    final picUrl = ApiConstants.mediaUrl(
                      (user['profileImage'] ?? user['profilePicture'])?.toString(),
                    );
                    if (picUrl.isEmpty) return _avatarText(user);
                    return Image.network(
                      picUrl,
                      width: 90, height: 90, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _avatarText(user),
                    );
                  }(),
                ),
              ),
              SizedBox(height: 14),
              Text(
                user['name'] ?? 'Unknown User',
                style: TextStyle(fontSize: AppTheme.fontSectionTitle, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  (user['role'] ?? 'Citizen').toString().capitalizeFirst!,
                  style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: AppTheme.fontMeta),
                ),
              ),
              const SizedBox(height: 24),
              _buildInfoRow(Icons.email_outlined, 'Email', user['email'] ?? 'Not provided'),
              _buildInfoRow(Icons.phone_outlined, 'Phone', user['phone'] ?? 'Not provided'),
              _buildInfoRow(Icons.location_on_outlined, 'District', user['district'] ?? 'Not provided'),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: () => Get.to(() => const ProfileEditScreen()),
                  icon: const Icon(Icons.edit, size: 16),
                  label: const Text('Edit Profile'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _avatarText(dynamic user) {
    return Center(
      child: Text(
        (user['name'] ?? 'U').toString().substring(0, 1).toUpperCase(),
        style: const TextStyle(fontSize: 34, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Container(
      margin: EdgeInsets.only(bottom: 10),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(color: AppTheme.primaryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: AppTheme.primaryColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(color: AppTheme.textSubtle, fontSize: AppTheme.fontSmall)),
                SizedBox(height: 2),
                Text(value, style: TextStyle(color: AppTheme.textPrimary, fontSize: AppTheme.fontBody, fontWeight: FontWeight.w500)),
              ],
            ),
          )
        ],
      ),
    );
  }
}