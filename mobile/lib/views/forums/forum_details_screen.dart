import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import '../../controllers/forum_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/api_constants.dart';
import '../../utils/theme.dart';

class ForumDetailsScreen extends StatefulWidget {
  final String forumId;

  const ForumDetailsScreen({Key? key, required this.forumId}) : super(key: key);

  @override
  State<ForumDetailsScreen> createState() => _ForumDetailsScreenState();
}

class _ForumDetailsScreenState extends State<ForumDetailsScreen> {
  final ForumController controller = Get.put(ForumController());
  final AuthController authController = Get.find<AuthController>();
  final _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    controller.fetchForumDetails(widget.forumId);
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Discussion'),
        actions: [
          Obx(() {
            final forum = controller.currentForum;
            final role = authController.user['role'];
            final isMod = role == 'admin' || role == 'moderator' || role == 'secretary';
            final score = ((forum['upvotes'] as List?)?.length ?? 0) - ((forum['downvotes'] as List?)?.length ?? 0);
            return Row(
              children: [
                if (isMod && forum.isNotEmpty)
                  IconButton(
                    tooltip: 'Delete',
                    onPressed: () async {
                      final confirmed = await Get.dialog<bool>(
                        AlertDialog(
                          backgroundColor: AppTheme.surfaceColor,
                          title: Text(
                            'Delete Forum',
                            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
                          ),
                          content: Text(
                            'Delete this discussion? This cannot be undone.',
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
                        final ok = await controller.deleteForum(widget.forumId);
                        if (ok) Get.back();
                      }
                    },
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                  ),
                IconButton(
                  onPressed: () async {
                    await controller.voteForum(widget.forumId, 'upvote');
                    controller.fetchForumDetails(widget.forumId);
                  },
                  icon: Icon(Icons.arrow_upward, color: AppTheme.primaryColor, size: 22),
                ),
                Text('$score', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: AppTheme.fontSectionTitle)),
                IconButton(
                  onPressed: () async {
                    await controller.voteForum(widget.forumId, 'downvote');
                    controller.fetchForumDetails(widget.forumId);
                  },
                  icon: Icon(Icons.arrow_downward, color: AppTheme.errorColor, size: 22),
                ),
                const SizedBox(width: 4),
              ],
            );
          }),
        ],
      ),
      body: Obx(() {
        if (controller.isDetailLoading.value) {
          return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
        }

        final forum = controller.currentForum;
        if (forum.isEmpty) {
          return Center(child: Text('Forum not found', style: TextStyle(color: AppTheme.textPrimary)));
        }

        final isApproved = forum['isApproved'] ?? false;

        return Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildForumHeader(forum, isApproved),
                    const SizedBox(height: 24),
                    _buildCommentsSection(),
                  ],
                ),
              ),
            ),
            if (isApproved) _buildCommentInput(),
          ],
        );
      }),
    );
  }

  Widget _buildForumHeader(Map forum, bool isApproved) {
    final author = forum['author'] ?? {};
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(forum['category'] ?? 'General',
                    style: const TextStyle(color: AppTheme.primaryColor, fontSize: AppTheme.fontMeta, fontWeight: FontWeight.bold)),
              ),
              if (!isApproved) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text('Pending Approval',
                      style: TextStyle(color: Colors.amber, fontSize: AppTheme.fontMeta, fontWeight: FontWeight.bold)),
                ),
              ],
            ],
          ),
          SizedBox(height: 12),
          Text(forum['title'] ?? '',
              style: TextStyle(color: AppTheme.textPrimary, fontSize: AppTheme.fontSectionTitle, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
                child: Text(
                  (author['name'] ?? 'U').toString().substring(0, 1).toUpperCase(),
                  style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: AppTheme.fontMeta),
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(author['name'] ?? 'Unknown', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: AppTheme.fontBody)),
                  Text(
                    '${author['role'] ?? 'Citizen'} · ${forum['createdAt'] != null ? _formatDate(forum['createdAt']) : ''}',
                    style: TextStyle(color: AppTheme.textSubtle, fontSize: AppTheme.fontMeta),
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: 16),
          Text(forum['description'] ?? '',
              style: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontCardTitle, height: 1.6)),
          // Attachments — images inline, other files as cards (like web)
          if (forum['images'] != null && (forum['images'] as List).isNotEmpty) ...[
            const SizedBox(height: 16),
            Builder(
              builder: (_) {
                const imageExts = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'};
                bool isImage(String path) {
                  final lower = path.toLowerCase();
                  final ext = lower.contains('.') ? lower.split('.').last.split('?').first : '';
                  return imageExts.contains(ext);
                }

                final all = (forum['images'] as List).map((e) => e.toString()).toList();
                final images = all.where(isImage).toList();
                final otherFiles = all.where((f) => !isImage(f)).toList();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (images.isNotEmpty)
                      SizedBox(
                        height: 100,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: images.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (_, i) {
                            final fullUrl = ApiConstants.mediaUrl(images[i]);
                            return ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: GestureDetector(
                                onTap: () => Get.dialog(
                                  Dialog(
                                    backgroundColor: Colors.transparent,
                                    child: InteractiveViewer(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(16),
                                        child: Image.network(fullUrl, fit: BoxFit.contain),
                                      ),
                                    ),
                                  ),
                                ),
                                child: Image.network(
                                  fullUrl,
                                  width: 100,
                                  height: 100,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 100,
                                    height: 100,
                                    decoration: BoxDecoration(
                                      color: AppTheme.backgroundColor,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(Icons.broken_image, color: AppTheme.textSubtle),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    if (otherFiles.isNotEmpty) ...[
                      if (images.isNotEmpty) const SizedBox(height: 10),
                      ...otherFiles.map((f) {
                        final name = f.split('/').last;
                        return Container(
                          margin: EdgeInsets.only(bottom: 8),
                          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppTheme.backgroundColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.borderColor),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.insert_drive_file_outlined,
                                  color: AppTheme.primaryColor, size: 22),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  name,
                                  style: TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              TextButton(
                                onPressed: () async {
                                  final fullUrl = ApiConstants.mediaUrl(f);
                                  // Reuse same in-app open pattern via temporary download
                                  try {
                                    final res = await http.get(Uri.parse(fullUrl))
                                        .timeout(const Duration(seconds: 60));
                                    if (res.statusCode != 200) {
                                      Get.snackbar('Error', 'Could not open file');
                                      return;
                                    }
                                    final dir = await getTemporaryDirectory();
                                    final name = f.split('/').last;
                                    final file = File('${dir.path}/$name');
                                    await file.writeAsBytes(res.bodyBytes, flush: true);
                                    await OpenFilex.open(file.path);
                                  } catch (_) {
                                    Get.snackbar('Error', 'Cannot open file');
                                  }
                                },
                                child: const Text('Open'),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ],
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCommentsSection() {
    return Obx(() {
      final comments = controller.forumComments;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Responses (${comments.length})',
              style: TextStyle(color: AppTheme.textPrimary, fontSize: AppTheme.fontSectionTitle, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (comments.isEmpty)
            Container(
              width: double.infinity,
              padding: EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.surfaceColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Text('No responses yet. Be the first to share your thoughts!',
                  textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textSubtle)),
            )
          else
            ...comments.map((comment) {
              final author = comment['author'] ?? {};
              return Container(
                margin: EdgeInsets.only(bottom: 12),
                padding: EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
                      child: Text(
                        (author['name'] ?? 'U').toString().substring(0, 1).toUpperCase(),
                        style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: AppTheme.fontMeta),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(author['name'] ?? 'Unknown',
                                  style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: AppTheme.fontBody)),
                              Text(
                                comment['createdAt'] != null ? _formatDate(comment['createdAt']) : '',
                                style: TextStyle(color: AppTheme.textSubtle, fontSize: AppTheme.fontSmall),
                              ),
                            ],
                          ),
                          SizedBox(height: 6),
                          Text(comment['text'] ?? '',
                              style: TextStyle(color: AppTheme.textMuted, fontSize: AppTheme.fontBody, height: 1.5)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      );
    });
  }

  Widget _buildCommentInput() {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        border: Border(top: BorderSide(color: AppTheme.borderColor)),
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _commentController,
                style: TextStyle(color: AppTheme.textPrimary),
                maxLines: null,
                decoration: InputDecoration(
                  hintText: 'Write your response...',
                  hintStyle: TextStyle(color: AppTheme.textSubtle),
                  filled: true,
                  fillColor: AppTheme.backgroundColor,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTheme.borderColor)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTheme.borderColor)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryColor)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Obx(() => IconButton(
              onPressed: controller.isSubmitting.value
                  ? null
                  : () async {
                      if (_commentController.text.trim().isEmpty) return;
                      final success = await controller.postComment(widget.forumId, _commentController.text.trim());
                      if (success) _commentController.clear();
                    },
              icon: controller.isSubmitting.value
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryColor))
                  : const Icon(Icons.send, color: AppTheme.primaryColor),
            )),
          ],
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return '';
    }
  }
}