import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../controllers/announcement_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/app_notification.dart';
import '../../utils/theme.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  final AnnouncementController controller = Get.put(AnnouncementController());
  final AuthController authController = Get.find<AuthController>();
  String _category = 'all';

  @override
  void initState() {
    super.initState();
    controller.fetchAnnouncements();
  }

  bool get _canManage => authController.user['role'] == 'admin' || authController.user['role'] == 'moderator';

  List<dynamic> get _filtered {
    if (_category == 'all') return controller.announcements;
    return controller.announcements.where((a) => (a['category'] ?? '').toString().toLowerCase() == _category.toLowerCase()).toList();
  }

  Color _catColor(String? cat) {
    switch (cat) {
      case 'Urgent': return Colors.red;
      case 'Meeting': return const Color(0xFF10B981);
      default: return const Color(0xFF14B8A6);
    }
  }

  Color? _catBg(String? cat) {
    switch (cat) {
      case 'Urgent': return Colors.red.withValues(alpha: 0.12);
      case 'Meeting': return const Color(0xFF10B981).withValues(alpha: 0.12);
      default: return const Color(0xFF14B8A6).withValues(alpha: 0.12);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Community Announcements'),
        actions: [
          if (_canManage)
            IconButton(
              icon: const Icon(Icons.add_circle_outline, color: AppTheme.primaryColor),
              onPressed: () => _showCreateDialog(),
            ),
        ],
      ),
      body: Column(
        children: [
          SizedBox(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              children: [
                _catChip('all', 'All'),
                const SizedBox(width: 8),
                _catChip('general', 'General'),
                const SizedBox(width: 8),
                _catChip('meeting', 'Meeting'),
                const SizedBox(width: 8),
                _catChip('urgent', 'Urgent'),
              ],
            ),
          ),
          Expanded(
            child: Obx(() {
              if (controller.isLoading.value) return const Center(child: CircularProgressIndicator());
              final items = _filtered;
              if (items.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 72, height: 72,
                        decoration: BoxDecoration(color: AppTheme.primaryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                        child: Icon(Icons.campaign_outlined, size: 36, color: AppTheme.textSubtle),
                      ),
                      SizedBox(height: 16),
                      Text('No announcements yet', style: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontCardTitle)),
                      SizedBox(height: 4),
                      Text('New announcements will appear here when posted.', style: TextStyle(color: AppTheme.textSubtle, fontSize: AppTheme.fontSmall)),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: () => controller.fetchAnnouncements(),
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  itemCount: items.length,
                  itemBuilder: (context, index) => _buildCard(items[index], index),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _catChip(String value, String label) {
    final active = _category == value;
    return GestureDetector(
      onTap: () => setState(() => _category = value),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: active ? AppTheme.primaryColor : AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: active ? AppTheme.primaryColor : AppTheme.borderColor),
        ),
        child: Text(label, style: TextStyle(color: active ? Colors.white : AppTheme.textMuted, fontSize: AppTheme.fontMeta, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildCard(dynamic a, int index) {
    final cat = a['category'] ?? 'General';
    final color = _catColor(cat);
    return Container(
          margin: EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppTheme.borderColor),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(height: 4, width: double.infinity, color: color),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: _catBg(cat), borderRadius: BorderRadius.circular(8)),
                          child: Text(cat, style: TextStyle(color: color, fontSize: AppTheme.fontSmall, fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 8),
                        if (a['createdAt'] != null || a['date'] != null)
                          Text(
                            DateFormat('MMM d, yyyy').format(DateTime.parse(a['date'] ?? a['createdAt'])),
                            style: TextStyle(color: AppTheme.textSubtle, fontSize: AppTheme.fontSmall),
                          ),
                        Spacer(),
                        if (_canManage)
                          PopupMenuButton(
                            icon: Icon(Icons.more_vert, color: AppTheme.textSubtle, size: 18),
                            itemBuilder: (_) => [
                              PopupMenuItem(
                                value: 'delete',
                                child: const Row(children: [
                                  Icon(Icons.delete_outline, color: Colors.red, size: 16),
                                  SizedBox(width: 8),
                                  Text('Delete', style: TextStyle(color: Colors.red)),
                                ]),
                              ),
                            ],
                            onSelected: (v) async {
                              if (v == 'delete') await controller.deleteAnnouncement(a['_id']);
                            },
                          ),
                      ],
                    ),
                    SizedBox(height: 10),
                    Text(a['title'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontSize: AppTheme.fontCardTitle, fontWeight: FontWeight.bold)),
                    SizedBox(height: 6),
                    Text(a['content'] ?? a['body'] ?? '', style: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontBody, height: 1.5)),
                    SizedBox(height: 12),
                    Container(
                      padding: EdgeInsets.only(top: 10),
                      decoration: BoxDecoration(border: Border(top: BorderSide(color: AppTheme.borderColor, width: 0.5))),
                      child: Row(
                        children: [
                          Icon(Icons.shield_outlined, size: 12, color: AppTheme.primaryColor),
                          SizedBox(width: 4),
                          Text('Posted by: ', style: TextStyle(color: AppTheme.textSubtle, fontSize: AppTheme.fontSmall)),
                          Text(
                            a['creator']?['name'] ?? 'Unknown',
                            style: TextStyle(color: AppTheme.textPrimary, fontSize: AppTheme.fontSmall, fontWeight: FontWeight.w600),
                          ),
                          SizedBox(width: 6),
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: AppTheme.backgroundColor, borderRadius: BorderRadius.circular(6)),
                            child: Text(
                              (a['creator']?['role'] ?? '').toString().capitalizeFirst!,
                              style: TextStyle(color: AppTheme.textSubtle, fontSize: AppTheme.fontSmall - 1, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
        ),
      ],
    ),
  );
  }

  void _showCreateDialog() {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    String category = 'General';
    DateTime selectedDate = DateTime.now();
    var publishing = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            final viewInsets = MediaQuery.of(context).viewInsets.bottom;
            final maxH = MediaQuery.of(context).size.height * 0.88;

            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              backgroundColor: Colors.white,
              insetPadding: EdgeInsets.fromLTRB(16, 24, 16, viewInsets > 0 ? 8 : 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(maxHeight: maxH - viewInsets * 0.3),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 18, 8, 8),
                      child: Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'New Announcement',
                              style: TextStyle(
                                color: Color(0xFF0F172A),
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: publishing ? null : () => Navigator.pop(dialogContext),
                            icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    Flexible(
                      child: SingleChildScrollView(
                        padding: EdgeInsets.fromLTRB(20, 8, 20, 20 + (viewInsets > 0 ? 8 : 0)),
                        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextField(
                              controller: titleCtrl,
                              textInputAction: TextInputAction.next,
                              decoration: InputDecoration(
                                hintText: 'Title',
                                filled: true,
                                fillColor: const Color(0xFFF1F5F9),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: contentCtrl,
                              maxLines: 4,
                              decoration: InputDecoration(
                                hintText: 'Announcement content...',
                                filled: true,
                                fillColor: const Color(0xFFF1F5F9),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              ),
                            ),
                            const SizedBox(height: 16),
                            DropdownButtonFormField<String>(
                              value: category,
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: const Color(0xFFF1F5F9),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              ),
                              icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF64748B)),
                              items: const [
                                DropdownMenuItem(value: 'General', child: Text('General')),
                                DropdownMenuItem(value: 'Meeting', child: Text('Meeting')),
                                DropdownMenuItem(value: 'Urgent', child: Text('Urgent')),
                                DropdownMenuItem(value: 'Infrastructure', child: Text('Infrastructure')),
                                DropdownMenuItem(value: 'Healthcare', child: Text('Healthcare')),
                                DropdownMenuItem(value: 'Education', child: Text('Education')),
                                DropdownMenuItem(value: 'Security', child: Text('Security')),
                              ],
                              onChanged: (v) => setStateDialog(() => category = v ?? 'General'),
                            ),
                            const SizedBox(height: 16),
                            GestureDetector(
                              onTap: () async {
                                final now = DateTime.now();
                                final today = DateTime(now.year, now.month, now.day);
                                final initial = selectedDate.isBefore(today) ? today : selectedDate;
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: initial,
                                  firstDate: today,
                                  lastDate: DateTime(2101),
                                );
                                if (picked != null) {
                                  setStateDialog(() => selectedDate = picked);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today_outlined, color: Color(0xFF94A3B8), size: 20),
                                    const SizedBox(width: 12),
                                    Text(
                                      DateFormat('yyyy-MM-dd').format(selectedDate),
                                      style: const TextStyle(color: Color(0xFF334155), fontSize: 16),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: ElevatedButton(
                                onPressed: publishing
                                    ? null
                                    : () async {
                                        if (titleCtrl.text.trim().isEmpty || contentCtrl.text.trim().isEmpty) {
                                          Get.snackbar('Error', 'Title and content are required');
                                          return;
                                        }
                                        setStateDialog(() => publishing = true);
                                        final success = await controller.createAnnouncement({
                                          'title': titleCtrl.text.trim(),
                                          'content': contentCtrl.text.trim(),
                                          'category': category,
                                          'date': selectedDate.toIso8601String(),
                                        });
                                        setStateDialog(() => publishing = false);
                                        if (success) {
                                          if (dialogContext.mounted) Navigator.pop(dialogContext);
                                          Future.microtask(() {
                                            AppNotification.success(
                                              'Announcement Created',
                                              'Announcement posted successfully',
                                            );
                                          });
                                        }
                                      },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryColor,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  elevation: 0,
                                ),
                                child: Text(
                                  publishing ? 'Publishing...' : 'Publish',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}