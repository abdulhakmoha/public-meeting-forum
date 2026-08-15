import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../controllers/forum_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/theme.dart';
import 'forum_details_screen.dart';
import 'create_forum_screen.dart';

class ForumsScreen extends StatefulWidget {
  ForumsScreen({super.key});
  @override
  State<ForumsScreen> createState() => _ForumsScreenState();
}

class _ForumsScreenState extends State<ForumsScreen> {
  final ForumController controller = Get.put(ForumController());
  final AuthController authCtrl = Get.find<AuthController>();
  final TextEditingController searchCtrl = TextEditingController();
  String _tab = 'active';
  String _search = '';
  String _categoryFilter = 'all';

  bool get _isMod => authCtrl.user['role'] == 'admin' || authCtrl.user['role'] == 'moderator' || authCtrl.user['role'] == 'secretary';

  Future<void> _confirmDeleteForum(dynamic forum) async {
    final author = forum['author'];
    final name = author is Map ? (author['name'] ?? 'Unknown') : 'Unknown';
    final role = author is Map ? (author['role'] ?? 'citizen').toString() : 'citizen';
    final roleLabel = role == 'admin'
        ? 'Admin'
        : role == 'moderator'
            ? 'Moderator'
            : 'Citizen';
    final confirmed = await Get.dialog<bool>(
      AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        title: Text(
          'Delete Forum',
          style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Delete "${forum['title'] ?? 'this topic'}"?\n\nCreated by: $name ($roleLabel)\n\nThis cannot be undone.',
          style: TextStyle(color: AppTheme.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: Text('Cancel', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Get.back(result: true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await controller.deleteForum(forum['_id']);
    }
  }

  List get _filtered {
    var items = controller.forumsList.where((f) {
      if (_tab == 'active' && f['isApproved'] == false) return false;
      if (_tab == 'pending' && f['isApproved'] != false) return false;
      if (_search.isNotEmpty && !(f['title'] ?? '').toString().toLowerCase().contains(_search.toLowerCase())) return false;
      if (_categoryFilter != 'all' && (f['category'] ?? '').toString().toLowerCase() != _categoryFilter.toLowerCase()) return false;
      return true;
    }).toList();
    return items;
  }

  int get _pendingCount => controller.forumsList.where((f) => f['isApproved'] == false).length;

  @override
  void dispose() {
    searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Community Forums')),
      body: Column(
        children: [
          // Search
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              controller: searchCtrl,
              decoration: InputDecoration(
                hintText: 'Search by title...',
                hintStyle: TextStyle(color: AppTheme.textSubtle, fontSize: 13),
                prefixIcon: Icon(Icons.search, color: AppTheme.textSubtle, size: 20),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(icon: Icon(Icons.clear, size: 16), onPressed: () { searchCtrl.clear(); setState(() => _search = ''); })
                    : null,
                filled: true, fillColor: AppTheme.surfaceColor,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                contentPadding: EdgeInsets.symmetric(vertical: 12),
              ),
              style: TextStyle(fontSize: 13, color: AppTheme.textPrimary),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          // Tabs + Category filter
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                _tabChip('active', 'Active Discussions'),
                if (_isMod) ...[
                  const SizedBox(width: 6),
                  _tabChip('pending', 'Pending (${_pendingCount})'),
                ],
                Spacer(),
                if (_isMod)
                  PopupMenuButton<String>(
                    icon: Icon(Icons.filter_list, color: AppTheme.textSubtle, size: 18),
                    onSelected: (v) => setState(() => _categoryFilter = v),
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'all', child: Text('All Categories')),
                      const PopupMenuItem(value: 'General', child: Text('General')),
                      const PopupMenuItem(value: 'Infrastructure', child: Text('Infrastructure')),
                      const PopupMenuItem(value: 'Education', child: Text('Education')),
                      const PopupMenuItem(value: 'Healthcare', child: Text('Healthcare')),
                      const PopupMenuItem(value: 'Security', child: Text('Security')),
                    ],
                  ),
              ],
            ),
          ),
          Expanded(
            child: Obx(() {
              if (controller.isLoading.value) {
                return const Center(child: CircularProgressIndicator());
              }
              final items = _filtered;
              if (items.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 72, height: 72,
                        decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                        child: Icon(Icons.forum_outlined, size: 36, color: AppTheme.textSubtle),
                      ),
                      SizedBox(height: 16),
                      Text(_tab == 'pending' ? 'No pending topics' : 'No forum topics found.',
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                      SizedBox(height: 4),
                      Text(_tab == 'pending' ? 'All topics have been reviewed.' : 'Start a discussion!',
                          style: TextStyle(color: AppTheme.textSubtle, fontSize: 12)),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: () => controller.fetchForums(),
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  itemCount: items.length,
                  itemBuilder: (_, i) => _buildForumCard(items[i]),
                ),
              );
            }),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Get.to(() => const CreateForumScreen()),
        backgroundColor: AppTheme.primaryColor,
        child: const Icon(Icons.add_comment, color: Colors.white),
      ),
    );
  }

  Widget _tabChip(String value, String label) {
    final active = _tab == value;
    return GestureDetector(
      onTap: () => setState(() => _tab = value),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppTheme.primaryColor : AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? AppTheme.primaryColor : AppTheme.borderColor),
        ),
        child: Text(label, style: TextStyle(color: active ? Colors.white : AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildForumCard(dynamic forum) {
    final score = ((forum['upvotes'] as List?)?.length ?? 0) - ((forum['downvotes'] as List?)?.length ?? 0);
    final author = forum['author'] ?? {};
    final commentsCount = (forum['comments'] as List?)?.length ?? 0;
    final isPending = forum['isApproved'] == false;

    return GestureDetector(
      onTap: () => Get.to(() => ForumDetailsScreen(forumId: forum['_id'])),
      child: Container(
        margin: EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isPending ? Colors.amber.withOpacity(0.3) : AppTheme.borderColor),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                    child: Text(forum['category'] ?? 'General',
                        style: const TextStyle(color: AppTheme.primaryColor, fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                  if (isPending) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: Colors.amber.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                      child: Text('PENDING', style: TextStyle(color: Colors.amber, fontSize: 8, fontWeight: FontWeight.bold)),
                    ),
                  ],
                  Spacer(),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppTheme.backgroundColor, borderRadius: BorderRadius.circular(10)),
                    child: Row(
                      children: [
                        Icon(Icons.arrow_upward, size: 12, color: score >= 0 ? Colors.green : AppTheme.errorColor),
                        const SizedBox(width: 2),
                        Text('$score', style: TextStyle(color: score >= 0 ? Colors.green : AppTheme.errorColor, fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  if (_isMod) ...[
                    const SizedBox(width: 6),
                    if (isPending)
                      GestureDetector(
                        onTap: () => controller.approveForum(forum['_id']),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.check_circle, color: Colors.green, size: 18),
                        ),
                      ),
                    if (isPending) const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () => _confirmDeleteForum(forum),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.withOpacity(0.25)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.delete_outline, color: Colors.red, size: 16),
                            SizedBox(width: 4),
                            Text(
                              'Delete',
                              style: TextStyle(
                                color: Colors.red,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              SizedBox(height: 10),
              Text(forum['title'] ?? 'Untitled Topic',
                  style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              SizedBox(height: 6),
              Text(forum['description'] ?? 'No content provided.',
                  style: TextStyle(color: AppTheme.textSubtle, fontSize: 12),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 12),
              Row(
                children: [
                  CircleAvatar(
                    radius: 10,
                    backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
                    child: Text((author['name'] ?? 'U').toString().substring(0, 1).toUpperCase(),
                        style: TextStyle(color: AppTheme.primaryColor, fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                  SizedBox(width: 6),
                  Text(author['name'] ?? 'Unknown', style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                  Spacer(),
                  Icon(Icons.comment_outlined, size: 14, color: AppTheme.textSubtle),
                  SizedBox(width: 4),
                  Text('$commentsCount', style: TextStyle(color: AppTheme.textSubtle, fontSize: 10)),
                ],
              ),
              if (!isPending)
                Container(
                  margin: const EdgeInsets.only(top: 10),
                  child: Text('View Thread →', style: TextStyle(color: AppTheme.primaryColor, fontSize: 10, fontWeight: FontWeight.w600)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}