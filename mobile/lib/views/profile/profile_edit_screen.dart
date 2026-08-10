import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/api_constants.dart';
import '../../utils/theme.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});
  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final AuthController authController = Get.find<AuthController>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _districtController;
  final _formKey = GlobalKey<FormState>();
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    final user = authController.user;
    _nameController = TextEditingController(text: user['name'] ?? '');
    _emailController = TextEditingController(text: user['email'] ?? '');
    _phoneController = TextEditingController(text: user['phone'] ?? '');
    _districtController = TextEditingController(text: user['district'] ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _districtController.dispose();
    super.dispose();
  }

  Future<void> _handlePickImage() async {
    final result = await FilePicker.pickFiles(type: FileType.image);
    if (result != null && result.files.isNotEmpty) {
      setState(() => _uploading = true);
      await authController.uploadProfileImage(result.files.first.path!);
      setState(() => _uploading = false);
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await authController.updateProfile({
      'name': _nameController.text.trim(),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'district': _districtController.text.trim(),
    });
    if (success) Get.back();
  }

  @override
  Widget build(BuildContext context) {
    final user = authController.user;
    final initial = (user['name'] ?? 'U').toString().substring(0, 1).toUpperCase();
    final pic = user['profileImage'] ?? user['profilePicture'];
    final profileUrl = (() {
      final u = ApiConstants.mediaUrl(pic?.toString());
      return u.isEmpty ? null : u;
    })();

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              const SizedBox(height: 10),
              Center(
                child: Stack(
                  children: [
                    Container(
                      width: 100, height: 100,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.15),
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.primaryColor.withOpacity(0.5), width: 2),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(50),
                        child: profileUrl != null
                            ? Image.network(profileUrl, width: 100, height: 100, fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => _avatarText(initial))
                            : _avatarText(initial),
                      ),
                    ),
                    Positioned(
                      bottom: 0, right: 0,
                      child: GestureDetector(
                        onTap: _uploading ? null : _handlePickImage,
                        child: Container(
                          padding: EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: _uploading ? AppTheme.textSubtle : AppTheme.primaryColor,
                            shape: BoxShape.circle,
                          ),
                          child: _uploading
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.camera_alt, size: 16, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 12),
              Text(user['name'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.15), borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3))),
                child: Text((user['role'] ?? 'Citizen').toString().toUpperCase(),
                    style: const TextStyle(color: AppTheme.primaryColor, fontSize: AppTheme.fontMeta, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 28),
              _buildField('Full Name', Icons.person_outline, _nameController),
              const SizedBox(height: 16),
              _buildField('Email', Icons.email_outlined, _emailController, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              _buildField('Phone', Icons.phone_outlined, _phoneController, keyboardType: TextInputType.phone),
              const SizedBox(height: 16),
              _buildField('District', Icons.location_on_outlined, _districtController),
              const SizedBox(height: 28),
              Obx(() => SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: authController.isLoading.value ? null : _handleSave,
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 4),
                  child: authController.isLoading.value
                      ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : const Text('Save Changes', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _avatarText(String initial) {
    return Center(child: Text(initial, style: const TextStyle(fontSize: 38, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)));
  }

  Widget _buildField(String label, IconData icon, TextEditingController controller, {TextInputType keyboardType = TextInputType.text}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontMeta, fontWeight: FontWeight.w600)),
        SizedBox(height: 8),
        TextFormField(
          controller: controller, keyboardType: keyboardType,
          style: TextStyle(color: AppTheme.textPrimary),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: AppTheme.textSubtle),
            filled: true, fillColor: AppTheme.surfaceColor,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: AppTheme.borderColor)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }
}