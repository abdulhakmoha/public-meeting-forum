import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../controllers/user_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/api_constants.dart';
import '../../utils/theme.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({Key? key}) : super(key: key);

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  final UserController controller = Get.put(UserController());
  final AuthController authController = Get.find<AuthController>();
  final TextEditingController searchCtrl = TextEditingController();

  bool get _isAdmin => authController.user['role'] == 'admin';

  @override
  void initState() {
    super.initState();
    controller.fetchUsers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Obx(() => Text('User Management (${controller.usersList.length})')),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: searchCtrl,
              decoration: InputDecoration(
                hintText: 'Search by name, email, or district...',
                hintStyle: TextStyle(color: AppTheme.textSubtle, fontSize: 13),
                prefixIcon: Icon(Icons.search, color: AppTheme.textSubtle, size: 20),
                filled: true,
                fillColor: AppTheme.surfaceColor,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              style: TextStyle(fontSize: 13, color: AppTheme.textPrimary),
              onChanged: (v) => controller.searchQuery.value = v,
            ),
          ),
          Expanded(
            child: Obx(() {
              if (controller.isLoading.value) {
                return const Center(child: CircularProgressIndicator());
              }
              final items = controller.filteredUsers;
              if (items.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 64, color: AppTheme.textSubtle),
                      SizedBox(height: 16),
                      Text('No users found', style: TextStyle(color: AppTheme.textMuted, fontSize: 16)),
                      if (controller.searchQuery.value.isNotEmpty)
                        SizedBox(height: 8),
                      if (controller.searchQuery.value.isNotEmpty)
                        Text('Try a different search term', style: TextStyle(color: AppTheme.textSubtle, fontSize: 12)),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: () => controller.fetchUsers(),
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: items.length,
                  itemBuilder: (_, i) => _buildUserCard(items[i]),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildUserCard(dynamic user) {
    final name = user['name'] ?? 'Unknown';
    final email = user['email'] ?? '';
    final phone = user['phone'] ?? '';
    final district = user['district'] ?? '';
    final role = (user['role'] ?? 'citizen').toString();
    final createdAt = user['createdAt'] ?? '';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final isSelf = user['_id'] == authController.user['_id'];

    Color roleColor;
    switch (role.toLowerCase()) {
      case 'admin':
        roleColor = Colors.purple;
        break;
      case 'moderator':
      case 'secretary':
        roleColor = Colors.cyan;
        break;
      default:
        roleColor = AppTheme.primaryColor;
    }

    return Container(
      margin: EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
                  child: () {
                    final picUrl = ApiConstants.mediaUrl(
                      (user['profileImage'] ?? user['profilePicture'])?.toString(),
                    );
                    if (picUrl.isEmpty) {
                      return Text(initial, style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 18));
                    }
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(22),
                      child: Image.network(
                        picUrl,
                        width: 44, height: 44, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Text(initial, style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 18)),
                      ),
                    );
                  }(),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
                      SizedBox(height: 2),
                      Text('Joined ${createdAt.isNotEmpty ? DateFormat('MMM yyyy').format(DateTime.parse(createdAt)) : ''}',
                          style: TextStyle(color: AppTheme.textSubtle, fontSize: 10)),
                    ],
                  ),
                ),
                if (_isAdmin && !isSelf)
                  PopupMenuButton<String>(
                    icon: Icon(Icons.more_vert, color: AppTheme.textMuted, size: 18),
                        onSelected: (v) async {
                          if (v == 'delete') {
                            final confirmed = await Get.defaultDialog(
                              title: 'Delete User',
                              titleStyle: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
                              backgroundColor: AppTheme.surfaceColor,
                              middleText: 'Are you sure you want to delete $name?',
                              textConfirm: 'Delete',
                              textCancel: 'Cancel',
                              confirmTextColor: Colors.white,
                              buttonColor: Colors.red,
                            );
                            if (confirmed != null) {
                              controller.deleteUser(user['_id']);
                            }
                          } else {
                            await controller.updateUserRole(user['_id'], v);
                          }
                        },
                        itemBuilder: (_) => [
                          PopupMenuItem(value: 'citizen', child: Text('Citizen', style: TextStyle(color: role == 'citizen' ? AppTheme.primaryColor : AppTheme.textMuted))),
                          PopupMenuItem(value: 'moderator', child: Text('Moderator', style: TextStyle(color: role == 'moderator' ? AppTheme.primaryColor : AppTheme.textMuted))),
                          PopupMenuItem(value: 'admin', child: Text('Admin', style: TextStyle(color: role == 'admin' ? AppTheme.primaryColor : AppTheme.textMuted))),
                          const PopupMenuDivider(),
                          PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red.shade400))),
                        ],
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _infoRow(Icons.email_outlined, email, Icons.phone_outlined, phone),
                  const SizedBox(height: 8),
                  _infoRow(Icons.location_on_outlined, district, Icons.shield_outlined, role.toUpperCase()),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: roleColor.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
              child: Text(role, style: TextStyle(color: roleColor, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon1, String text1, IconData icon2, String text2) {
    return Row(
      children: [
        Icon(icon1, size: 14, color: AppTheme.textSubtle),
        SizedBox(width: 6),
        Expanded(child: Text(text1, style: TextStyle(color: AppTheme.textMuted, fontSize: 11))),
        SizedBox(width: 12),
        Icon(icon2, size: 14, color: AppTheme.textSubtle),
        SizedBox(width: 6),
        Text(text2, style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
      ],
    );
  }

}