import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:file_picker/file_picker.dart';
import '../../controllers/project_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../services/api_service.dart';
import '../../utils/api_constants.dart';
import '../../utils/file_kind.dart';
import '../../utils/project_draft_store.dart';
import '../../utils/forum_draft_store.dart';
import '../../utils/theme.dart';
import '../../utils/status_workflow.dart';

class ProjectsScreen extends StatefulWidget {
  final bool openCreateOnStart;

  const ProjectsScreen({Key? key, this.openCreateOnStart = false}) : super(key: key);

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  static const _pickerChannel = MethodChannel('com.pmcfms.mobile/file_picker');

  final ProjectController controller = Get.put(ProjectController());
  final AuthController authController = Get.find<AuthController>();
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    controller.fetchProjects();
    if (widget.openCreateOnStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showCreateDialog();
      });
    }
  }

  bool get _canCreate => authController.user['role'] == 'admin' || authController.user['role'] == 'moderator';

  List<dynamic> get _filtered {
    if (_filter == 'all') return controller.projects;
    return controller.projects.where((p) => (p['status'] ?? '').toString().toLowerCase() == _filter.toLowerCase()).toList();
  }

  int _countByStatus(String status) {
    return controller.projects.where((p) => (p['status'] ?? '').toString().toLowerCase() == status.toLowerCase()).length;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Community Projects'),
        actions: [
          if (_canCreate)
            IconButton(
              icon: const Icon(Icons.add_circle_outline, color: AppTheme.primaryColor),
              onPressed: () => _showCreateDialog(),
            ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _filterChip('all', 'All'),
                const SizedBox(width: 8),
                _filterChip('Planning', 'Planning'),
                const SizedBox(width: 8),
                _filterChip('In Progress', 'Active'),
                const SizedBox(width: 8),
                _filterChip('Completed', 'Done'),
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
                      Icon(Icons.work_outline, size: 64, color: AppTheme.textSubtle),
                      SizedBox(height: 16),
                      Text('No projects yet', style: TextStyle(color: AppTheme.textMuted, fontSize: 16)),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: () => controller.fetchProjects(),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildStatsSummary(),
                    const SizedBox(height: 16),
                    ...items.map((p) => _buildCard(p)),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSummary() {
    return Row(
      children: [
        _statCard('Planning', _countByStatus('Planning'), const Color(0xFF3B82F6), Icons.work_outline),
        const SizedBox(width: 12),
        _statCard('In Progress', _countByStatus('In Progress'), const Color(0xFFF59E0B), Icons.trending_up),
        const SizedBox(width: 12),
        _statCard('Completed', _countByStatus('Completed'), const Color(0xFF10B981), Icons.check_circle_outline),
      ],
    );
  }

  Widget _statCard(String label, int count, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 18),
            ),
            SizedBox(height: 8),
            Text('$count', style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold)),
            SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String value, String label) {
    final active = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: active ? AppTheme.primaryColor : AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: active ? AppTheme.primaryColor : AppTheme.borderColor),
        ),
        child: Text(label, style: TextStyle(color: active ? Colors.white : AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'Completed': return Colors.green;
      case 'In Progress': return Colors.orange;
      case 'Planning': return Colors.blue;
      default: return AppTheme.textSubtle;
    }
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'Completed': return 'Completed \u2713';
      case 'In Progress': return 'In Progress \u25B6';
      default: return 'Planning \u25CB';
    }
  }

  String? _mainImageUrl(dynamic p) {
    final progressImages = (p['progressImages'] as List?) ?? [];
    final inProgress = progressImages.where((f) => f['status'] == 'In Progress' || f['status'] == null).toList();
    final completed = progressImages.where((f) => f['status'] == 'Completed').toList();
    if (p['imageUrl'] != null && (p['imageUrl'] as String).isNotEmpty) return p['imageUrl'];
    if (inProgress.isNotEmpty) return inProgress.last['url'];
    if (completed.isNotEmpty) return completed.last['url'];
    return null;
  }

  Widget _buildCard(dynamic p) {
    final status = (p['status'] ?? 'Planning').toString();
    final color = _statusColor(status);
    final progress = (p['progress'] ?? 0).toDouble();
    final progressImages = (p['progressImages'] as List?) ?? [];

    return GestureDetector(
      onTap: () => _openDetails(p),
      child: Container(
        margin: EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header image or placeholder
            ...() {
              final mainImg = _mainImageUrl(p);
              if (mainImg != null) {
                Future<void> openMainFile() async {
                  final url = ApiConstants.mediaUrl(mainImg);
                  final uri = Uri.parse(url);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                }

                if (isPdfFile(mainImg) || !isImageFile(mainImg)) {
                  return [
                    GestureDetector(
                      onTap: () async {
                        await openMainFile();
                      },
                      child: Container(
                        height: 140,
                        decoration: BoxDecoration(
                          color: isPdfFile(mainImg)
                              ? Colors.red.withValues(alpha: 0.05)
                              : Colors.blueGrey.withValues(alpha: 0.06),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        ),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isPdfFile(mainImg) ? Icons.picture_as_pdf : Icons.insert_drive_file_outlined,
                                color: isPdfFile(mainImg) ? Colors.red.shade300 : Colors.blueGrey.shade300,
                                size: 40,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                isPdfFile(mainImg) ? 'Tap to open PDF' : 'Tap to open file',
                                style: TextStyle(
                                  color: isPdfFile(mainImg) ? Colors.red.shade400 : Colors.blueGrey.shade400,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ];
                }

                return [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                    child: Image.network(
                      ApiConstants.mediaUrl(mainImg),
                      height: 140,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => GestureDetector(
                        onTap: openMainFile,
                        child: Container(
                          height: 140,
                          color: Colors.red.withValues(alpha: 0.05),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.insert_drive_file, color: Colors.red.shade300, size: 36),
                                const SizedBox(height: 4),
                                Text('Tap to open file', style: TextStyle(color: Colors.red.shade400, fontSize: 11, fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ];
              }
              return [
                Container(
                  height: 140,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [
                      AppTheme.primaryColor.withValues(alpha: 0.1),
                      AppTheme.primaryColor.withValues(alpha: 0.05),
                    ]),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  child: Center(child: Icon(Icons.work_outline, color: AppTheme.primaryColor.withValues(alpha: 0.3), size: 36)),
                ),
              ];
            }(),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                        child: Text(_statusLabel(status), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                      const Spacer(),
                      if (_canCreate)
                        GestureDetector(
                          onTap: () => _confirmDelete(p['_id']),
                          child: Icon(Icons.delete_outline, color: Colors.red.shade300, size: 18),
                        ),
                    ],
                  ),
                  SizedBox(height: 10),
                  Text(p['title'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                  if (p['description'] != null) ...[
                    SizedBox(height: 6),
                    Text(p['description'], style: TextStyle(color: AppTheme.textMuted, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                  const SizedBox(height: 12),
                  // Progress bar
                  Row(
                    children: [
                      Icon(Icons.trending_up, size: 14, color: AppTheme.primaryColor),
                      SizedBox(width: 4),
                      Text('Progress', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                      const Spacer(),
                      Text('${progress.toInt()}%', style: TextStyle(color: AppTheme.primaryColor, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress / 100,
                      backgroundColor: AppTheme.borderColor,
                      valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                      minHeight: 6,
                    ),
                  ),
                  // Thumbnail previews
                  if (progressImages.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    ...() {
                      final inProgressImgs = progressImages.where((f) => (f['status'] ?? 'In Progress') == 'In Progress').toList();
                      final completedImgs = progressImages.where((f) => f['status'] == 'Completed').toList();
                      final widgets = <Widget>[];
                      if (inProgressImgs.isNotEmpty) {
                        widgets.add(
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFFF59E0B), shape: BoxShape.circle)),
                                  const SizedBox(width: 4),
                                  Text('Progress (${inProgressImgs.length})', style: TextStyle(color: Colors.orange.shade600, fontSize: 9, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              SizedBox(
                                height: 36,
                                child: ListView(
                                  scrollDirection: Axis.horizontal,
                                  children: inProgressImgs.take(4).map((f) {
                                    final thumbUrl = ApiConstants.mediaUrl(f['url']?.toString());
                                    return Padding(
                                      padding: const EdgeInsets.only(right: 4),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(6),
                                        child: Image.network(thumbUrl, width: 36, height: 36, fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => Container(width: 36, height: 36, color: Colors.orange.withValues(alpha: 0.1), child: Icon(Icons.image, size: 14, color: Colors.orange.shade300)),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                      if (completedImgs.isNotEmpty) {
                        widgets.add(const SizedBox(height: 6));
                        widgets.add(
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle)),
                                  const SizedBox(width: 4),
                                  Text('Completed (${completedImgs.length})', style: TextStyle(color: Colors.green.shade600, fontSize: 9, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              SizedBox(
                                height: 36,
                                child: ListView(
                                  scrollDirection: Axis.horizontal,
                                  children: completedImgs.take(4).map((f) {
                                    final thumbUrl = ApiConstants.mediaUrl(f['url']?.toString());
                                    return Padding(
                                      padding: const EdgeInsets.only(right: 4),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(6),
                                        child: Image.network(thumbUrl, width: 36, height: 36, fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => Container(width: 36, height: 36, color: Colors.green.withValues(alpha: 0.1), child: Icon(Icons.check_circle, size: 14, color: Colors.green.shade300)),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                      return widgets;
                    }(),
                  ],
                  const SizedBox(height: 12),
                  // Bottom info row
                  Container(
                    padding: EdgeInsets.only(top: 12),
                    decoration: BoxDecoration(border: Border(top: BorderSide(color: AppTheme.borderColor, width: 0.5))),
                    child: Row(
                      children: [
                        Icon(Icons.location_on_outlined, size: 14, color: AppTheme.primaryColor),
                        SizedBox(width: 4),
                        Text(p['location'] ?? '', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                        const Spacer(),
                        if (p['budget'] != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: Colors.green.withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
                            child: Text('\$${p['budget']}', style: TextStyle(color: Colors.green.shade600, fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _isPdf(String? url, {String? mime, String? name}) {
    return isPdfFile(url, mime: mime, name: name);
  }

  void _confirmDelete(String id) {
    Get.defaultDialog(
      title: 'Delete Project',
      titleStyle: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
      backgroundColor: AppTheme.surfaceColor,
      middleText: 'Are you sure you want to delete this project?',
      textConfirm: 'Delete',
      textCancel: 'Cancel',
      confirmTextColor: Colors.white,
      buttonColor: Colors.red,
      onConfirm: () async {
        await controller.deleteProject(id);
        Get.back();
        Get.snackbar('Deleted', 'Project deleted successfully');
      },
    );
  }

  void _openDetails(dynamic project) async {
    final details = await controller.fetchProjectDetails(project['_id']);
    if (details == null) return;
    if (!mounted) return;

    final commentCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DetailsSheet(
        project: details,
        canCreate: authController.user['role'] == 'admin' || authController.user['role'] == 'moderator',
        commentCtrl: commentCtrl,
        onAddComment: (text) async {
          final updated = await controller.addComment(details['_id'], text);
          if (updated != null && mounted) {
            Navigator.pop(context);
            _openDetails(updated);
          }
        },
        onUploadFile: (targetStatus) async {
          final updated = await _uploadProgressFile(details, targetStatus);
          if (updated != null && mounted) {
            Navigator.pop(context);
            _openDetails(updated);
          }
        },
      ),
    );
  }

  Future<Map<String, dynamic>?> _uploadProgressFile(dynamic project, String targetStatus) async {
    String? localPath;
    String? fileName;

    try {
      final raw = await _pickerChannel.invokeMethod<String>('pickProgressImage');
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is List && decoded.isNotEmpty) {
          final first = Map<String, dynamic>.from(decoded.first as Map);
          localPath = first['path']?.toString();
          fileName = first['name']?.toString();
        }
      }
    } catch (_) {
      // Fall back to FilePicker if native channel fails
    }

    if (localPath == null || localPath.isEmpty || !File(localPath).existsSync()) {
      final result = await FilePicker.pickFiles(
        type: FileType.image,
        withData: true,
      );
      if (result == null || result.files.isEmpty) return null;
      final file = result.files.first;
      Get.showSnackbar(const GetSnackBar(
        message: 'Uploading image...',
        duration: Duration(seconds: 2),
      ));
      final url = await ApiService.uploadPlatformFile(file);
      if (url == null) {
        Get.snackbar('Upload failed', ApiService.lastUploadError ?? 'Could not upload image');
        return null;
      }
      final updated = await controller.addProgressFile(project['_id'], url, targetStatus);
      if (updated == null) {
        Get.snackbar('Error', 'Could not save progress image');
        return null;
      }
      await controller.fetchProjects();
      Get.snackbar(
        'Success',
        targetStatus == 'Completed' ? 'Marked 100% complete' : 'Progress set to 50%',
      );
      return updated;
    }

    Get.showSnackbar(GetSnackBar(
      message: 'Uploading ${fileName ?? 'image'}...',
      duration: const Duration(seconds: 2),
    ));

    final url = await ApiService.uploadLocalPath(localPath, filename: fileName ?? 'progress.jpg');
    if (url == null) {
      Get.snackbar('Upload failed', ApiService.lastUploadError ?? 'Could not upload image');
      return null;
    }

    final updated = await controller.addProgressFile(project['_id'], url, targetStatus);
    if (updated == null) {
      Get.snackbar('Error', 'Could not save progress image');
      return null;
    }

    await controller.fetchProjects();
    Get.snackbar(
      'Success',
      targetStatus == 'Completed' ? 'Marked 100% complete' : 'Progress set to 50%',
    );
    return updated;
  }

  Future<void> _showCreateDialog() async {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final budgetCtrl = TextEditingController();
    final locationCtrl = TextEditingController();
    String status = 'Planning';
    String? imageUrl;
    String? localPath;
    String? pendingFileName;
    bool uploading = false;
    String? errorMsg;
    var didSchedulePoll = false;

    final draft = await ProjectDraftStore.load();
    if (draft != null) {
      titleCtrl.text = (draft['title'] ?? '').toString();
      descCtrl.text = (draft['description'] ?? '').toString();
      locationCtrl.text = (draft['location'] ?? '').toString();
      budgetCtrl.text = (draft['budget'] ?? '').toString();
      status = (draft['status'] ?? 'Planning').toString();
      final savedUrl = (draft['imageUrl'] ?? '').toString();
      if (savedUrl.isNotEmpty) imageUrl = savedUrl;
      final savedLocal = (draft['localPath'] ?? '').toString();
      final savedName = (draft['localName'] ?? '').toString();
      if (savedLocal.isNotEmpty && File(savedLocal).existsSync()) {
        localPath = savedLocal;
        pendingFileName =
            savedName.isNotEmpty ? savedName : savedLocal.split(RegExp(r'[\\/]')).last;
      }
    }

    Future<void> persistDraft() async {
      await ProjectDraftStore.save(
        title: titleCtrl.text,
        description: descCtrl.text,
        location: locationCtrl.text,
        budget: budgetCtrl.text,
        status: status,
        imageUrl: imageUrl,
        localPath: localPath,
        localName: pendingFileName,
      );
    }

    Future<void> applyStaged(
      List<Map<String, String>> staged,
      void Function(void Function()) setDialogState,
    ) async {
      if (staged.isEmpty) return;
      final path = staged.first['path'] ?? '';
      final name = staged.first['name'] ?? 'file';
      if (path.isEmpty || !File(path).existsSync()) return;

      // Show file immediately — do not wait for server upload
      setDialogState(() {
        localPath = path;
        pendingFileName = name;
        errorMsg = null;
        uploading = true;
      });
      await persistDraft();

      final url = await ApiService.uploadLocalPath(path, filename: name);
      setDialogState(() {
        uploading = false;
        if (url != null) {
          imageUrl = url;
          errorMsg = null;
        } else {
          errorMsg = ApiService.lastUploadError ??
              'Upload pending — tap Save to retry, or pick the file again';
        }
      });
      await persistDraft();
    }

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> pickProjectFile() async {
              await persistDraft();
              await ProjectDraftStore.markResume();
              // Clear any leftover forum staging from older bugs
              try {
                await ForumDraftStore.consumeStagedFiles();
              } catch (_) {}

              String? raw;
              try {
                raw = await _pickerChannel
                    .invokeMethod<String>('pickProjectFile')
                    .timeout(const Duration(minutes: 3));
              } on PlatformException catch (e) {
                if (dialogContext.mounted) {
                  setDialogState(() => errorMsg = e.message ?? 'Could not open file picker');
                }
                return;
              } catch (_) {
                raw = null;
              }

              List<Map<String, String>> stagedList = [];
              if (raw != null && raw.isNotEmpty) {
                try {
                  stagedList = (jsonDecode(raw) as List)
                      .map((e) => Map<String, String>.from(
                            (e as Map).map((k, v) => MapEntry(k.toString(), v.toString())),
                          ))
                      .toList();
                } catch (_) {}
              }
              if (stagedList.isEmpty) {
                for (var i = 0; i < 20; i++) {
                  stagedList = await ProjectDraftStore.peekStagedFiles();
                  if (stagedList.isNotEmpty) break;
                  await Future.delayed(const Duration(milliseconds: 400));
                  if (!dialogContext.mounted) return;
                }
              }
              await ProjectDraftStore.consumeStagedFiles();
              if (!dialogContext.mounted) return;
              await applyStaged(stagedList, setDialogState);
            }

            if (!didSchedulePoll &&
                widget.openCreateOnStart &&
                imageUrl == null &&
                localPath == null) {
              didSchedulePoll = true;
              WidgetsBinding.instance.addPostFrameCallback((_) async {
                for (var i = 0; i < 20; i++) {
                  if (!dialogContext.mounted) return;
                  if (imageUrl != null || localPath != null) return;
                  final peeked = await ProjectDraftStore.peekStagedFiles();
                  if (peeked.isNotEmpty) {
                    await ProjectDraftStore.consumeStagedFiles();
                    await applyStaged(peeked, setDialogState);
                    return;
                  }
                  await Future.delayed(const Duration(milliseconds: 400));
                }
              });
            }

            final displayName = pendingFileName ?? '';
            final isPdf = isPdfFile(imageUrl, name: displayName);
            final isImage = isImageFile(imageUrl, name: displayName);
            final hasFile = imageUrl != null || localPath != null;

            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              backgroundColor: AppTheme.surfaceColor,
              insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Register New Project',
                        style: TextStyle(
                          color: Color(0xFF0F172A),
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 24),
                      if (errorMsg != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEE2E2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            errorMsg!,
                            style: const TextStyle(
                              color: Color(0xFFEF4444),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      TextField(
                        controller: titleCtrl,
                        onChanged: (_) => persistDraft(),
                        decoration: InputDecoration(
                          hintText: 'Project Title',
                          filled: true,
                          fillColor: const Color(0xFFF1F5F9),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding:
                              const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: locationCtrl,
                              onChanged: (_) => persistDraft(),
                              decoration: InputDecoration(
                                hintText: 'District / Location',
                                filled: true,
                                fillColor: const Color(0xFFF1F5F9),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 16,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextField(
                              controller: budgetCtrl,
                              keyboardType: TextInputType.number,
                              onChanged: (_) => persistDraft(),
                              decoration: InputDecoration(
                                hintText: 'Budget (USD)',
                                filled: true,
                                fillColor: const Color(0xFFF1F5F9),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 16,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'AUDIT STATUS',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.7,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              StatusWorkflow.projectFlow.join(' → '),
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0F766E),
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Starts at Planning — advances in order automatically.',
                              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.auto_graph, size: 16, color: Color(0xFF3B82F6)),
                            const SizedBox(width: 8),
                            Text(
                              'Auto Progress: ${StatusWorkflow.autoProgress('Planning')}%',
                              style: const TextStyle(
                                color: Color(0xFF1D4ED8),
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      GestureDetector(
                        onTap: uploading ? null : pickProjectFile,
                        child: Container(
                          width: double.infinity,
                          constraints: const BoxConstraints(minHeight: 100),
                          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                          decoration: BoxDecoration(
                            color: hasFile ? const Color(0xFFD1FAE5) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: hasFile ? AppTheme.primaryColor : Colors.transparent,
                              width: 1.5,
                            ),
                          ),
                          child: hasFile
                              ? Stack(
                                  children: [
                                    Center(
                                      child: uploading
                                          ? Column(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                const SizedBox(
                                                  width: 28,
                                                  height: 28,
                                                  child: CircularProgressIndicator(strokeWidth: 2.5),
                                                ),
                                                const SizedBox(height: 10),
                                                Text(
                                                  displayName.isNotEmpty ? displayName : 'Uploading…',
                                                  textAlign: TextAlign.center,
                                                  style: const TextStyle(
                                                    color: Color(0xFF334155),
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                  maxLines: 2,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            )
                                          : Column(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  isPdf
                                                      ? Icons.picture_as_pdf
                                                      : (isImage ? Icons.check_circle : Icons.insert_drive_file),
                                                  size: 36,
                                                  color: isPdf
                                                      ? const Color(0xFFEF4444)
                                                      : (isImage
                                                          ? AppTheme.primaryColor
                                                          : const Color(0xFF64748B)),
                                                ),
                                                const SizedBox(height: 6),
                                                Text(
                                                  displayName.isNotEmpty
                                                      ? displayName
                                                      : (isPdf
                                                          ? 'PDF selected'
                                                          : (isImage ? 'Image selected' : 'File selected')),
                                                  textAlign: TextAlign.center,
                                                  style: TextStyle(
                                                    color: isPdf
                                                        ? const Color(0xFFEF4444)
                                                        : (isImage
                                                            ? const Color(0xFF047857)
                                                            : const Color(0xFF475569)),
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                  maxLines: 2,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ),
                                    ),
                                    Positioned(
                                      top: 0,
                                      right: 0,
                                      child: GestureDetector(
                                        onTap: () {
                                          setDialogState(() {
                                            imageUrl = null;
                                            localPath = null;
                                            pendingFileName = null;
                                            errorMsg = null;
                                          });
                                          persistDraft();
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.all(4),
                                          decoration: const BoxDecoration(
                                            color: Colors.red,
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.close, size: 14, color: Colors.white),
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : const Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.upload_file, size: 32, color: Color(0xFF94A3B8)),
                                    SizedBox(height: 8),
                                    Text(
                                      'Upload Project File',
                                      style: TextStyle(color: Color(0xFF475569), fontSize: 14),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Any file type (optional)',
                                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: descCtrl,
                        maxLines: 3,
                        onChanged: (_) => persistDraft(),
                        decoration: InputDecoration(
                          hintText: 'Full Description',
                          filled: true,
                          fillColor: const Color(0xFFF1F5F9),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding:
                              const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () async {
                                await ProjectDraftStore.clear();
                                if (dialogContext.mounted) Navigator.pop(dialogContext);
                              },
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                side: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              child: const Text(
                                'Cancel',
                                style: TextStyle(
                                  color: Color(0xFF334155),
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: uploading
                                  ? null
                                  : () async {
                                      if (titleCtrl.text.isEmpty || locationCtrl.text.isEmpty) {
                                        setDialogState(
                                          () => errorMsg = 'Title and Location are required',
                                        );
                                        return;
                                      }
                                      setDialogState(() => errorMsg = null);

                                      var finalUrl = imageUrl;
                                      if (finalUrl == null &&
                                          localPath != null &&
                                          File(localPath!).existsSync()) {
                                        setDialogState(() => uploading = true);
                                        finalUrl = await ApiService.uploadLocalPath(
                                          localPath!,
                                          filename: pendingFileName ?? 'file',
                                        );
                                        setDialogState(() {
                                          uploading = false;
                                          imageUrl = finalUrl;
                                        });
                                        if (finalUrl == null) {
                                          setDialogState(() {
                                            errorMsg = ApiService.lastUploadError ??
                                                'Failed to upload file';
                                          });
                                          return;
                                        }
                                      }

                                      final success = await controller.createProject({
                                        'title': titleCtrl.text.trim(),
                                        'description': descCtrl.text.trim(),
                                        'budget': budgetCtrl.text.isNotEmpty
                                            ? num.tryParse(budgetCtrl.text)
                                            : null,
                                        'location': locationCtrl.text.trim(),
                                        'status': 'Planning',
                                        if (finalUrl != null) 'imageUrl': finalUrl,
                                      });
                                      if (success) {
                                        await ProjectDraftStore.clear();
                                        if (dialogContext.mounted) {
                                          Navigator.pop(dialogContext);
                                        }
                                      }
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 0,
                              ),
                              child: const Text(
                                'Save',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppTheme.textSubtle),
      filled: true,
      fillColor: AppTheme.backgroundColor,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}

class _DetailsSheet extends StatelessWidget {
  final dynamic project;
  final bool canCreate;
  final TextEditingController commentCtrl;
  final Function(String) onAddComment;
  final Function(String) onUploadFile;

  const _DetailsSheet({
    required this.project,
    required this.canCreate,
    required this.commentCtrl,
    required this.onAddComment,
    required this.onUploadFile,
  });

  @override
  Widget build(BuildContext context) {
    final progress = (project['progress'] ?? 0).toDouble();
    final progressImages = (project['progressImages'] as List?) ?? [];
    final inProgressFiles = progressImages.where((f) {
      final s = (f['status'] ?? 'In Progress').toString();
      return s == 'In Progress';
    }).toList();
    final completedFiles = progressImages.where((f) => (f['status'] ?? '').toString() == 'Completed').toList();
    final comments = (project['comments'] as List?) ?? [];
    final status = (project['status'] ?? 'Planning').toString();
    final statusColor = status == 'Completed'
        ? Colors.green
        : status == 'In Progress'
            ? Colors.orange
            : Colors.blue;

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollCtrl) => Container(
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.work_outline, color: AppTheme.primaryColor, size: 20),
                  SizedBox(width: 8),
                  Text('Project Details', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                  Spacer(),
                  IconButton(
                    icon: Icon(Icons.close, size: 20, color: AppTheme.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: EdgeInsets.symmetric(horizontal: 16),
                children: [
                  Text(project['title'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: statusColor.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                        child: Text(status, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                      SizedBox(width: 8),
                      Icon(Icons.location_on_outlined, size: 14, color: AppTheme.primaryColor),
                      SizedBox(width: 3),
                      Text(project['location'] ?? '', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      const SizedBox(width: 12),
                      if (project['budget'] != null) ...[
                        Icon(Icons.attach_money, size: 14, color: Colors.green.shade500),
                        Text('\$${project['budget']}', style: TextStyle(color: Colors.green.shade600, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ],
                  ),
                  if (project['description'] != null) ...[
                    SizedBox(height: 12),
                    Text(project['description'], style: TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.5)),
                  ],
                  const SizedBox(height: 20),
                  // Progress
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [
                        AppTheme.primaryColor.withOpacity(0.06),
                        AppTheme.primaryColor.withOpacity(0.03),
                      ]),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.primaryColor.withOpacity(0.12)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Icon(Icons.trending_up, size: 16, color: AppTheme.primaryColor),
                            SizedBox(width: 6),
                            Text('Project Progress', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                            const Spacer(),
                            Text('${progress.toInt()}%', style: TextStyle(color: AppTheme.primaryColor, fontSize: 14, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: progress / 100,
                            backgroundColor: AppTheme.borderColor,
                            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                            minHeight: 8,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // In Progress Files
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.orange, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Text('In Progress (${inProgressFiles.length})', style: TextStyle(color: Colors.orange.shade600, fontSize: 14, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (inProgressFiles.isNotEmpty)
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: inProgressFiles.map((file) => _buildFileThumbnail(file, Colors.orange)).toList(),
                    )
                  else
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text('No progress files uploaded yet.', style: TextStyle(color: AppTheme.textSubtle, fontSize: 12, fontStyle: FontStyle.italic)),
                    ),

                  // Completed Files
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Text('Completed (${completedFiles.length})', style: TextStyle(color: Colors.green.shade600, fontSize: 14, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (completedFiles.isNotEmpty)
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: completedFiles.map((file) => _buildFileThumbnail(file, Colors.green)).toList(),
                    )
                  else
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text('No completed files uploaded yet.', style: TextStyle(color: AppTheme.textSubtle, fontSize: 12, fontStyle: FontStyle.italic)),
                    ),

                  // Upload buttons — audit order only
                  if (canCreate) ...[
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 12),
                    Builder(
                      builder: (_) {
                        final st = (project['status'] ?? 'Planning').toString();
                        final showInProgress = st == 'Planning' || st == 'In Progress';
                        final showCompleted = st == 'In Progress';
                        if (st == 'Completed') {
                          return Text(
                            'Audit complete — project is Completed.',
                            style: TextStyle(color: AppTheme.textSubtle, fontSize: 12, fontStyle: FontStyle.italic),
                          );
                        }
                        return Row(
                          children: [
                            if (showInProgress)
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => onUploadFile('In Progress'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.orange.withOpacity(0.2)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.upload_file, size: 16, color: Colors.orange.shade600),
                                        const SizedBox(width: 6),
                                        Text(
                                          st == 'Planning' ? '→ In Progress' : 'Add Progress',
                                          style: TextStyle(color: Colors.orange.shade600, fontSize: 12, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            if (showInProgress && showCompleted) const SizedBox(width: 12),
                            if (showCompleted)
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => onUploadFile('Completed'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    decoration: BoxDecoration(
                                      color: Colors.green.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.green.withOpacity(0.2)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.upload_file, size: 16, color: Colors.green.shade600),
                                        const SizedBox(width: 6),
                                        Text('→ Completed', style: TextStyle(color: Colors.green.shade600, fontSize: 12, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                  ],

                  // Comments
                  const SizedBox(height: 20),
                  const Divider(),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.comment_outlined, size: 16, color: AppTheme.primaryColor),
                      SizedBox(width: 6),
                      Text('Comments (${comments.length})', style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (comments.isNotEmpty)
                    ...comments.map((c) => Container(
                      margin: EdgeInsets.only(bottom: 10),
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.backgroundColor,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(c['authorName'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                              Spacer(),
                              Text(
                                c['createdAt'] != null ? DateFormat('MMM d, yyyy HH:mm').format(DateTime.parse(c['createdAt'])) : '',
                                style: TextStyle(color: AppTheme.textSubtle, fontSize: 10),
                              ),
                            ],
                          ),
                          SizedBox(height: 6),
                          Text(c['text'] ?? '', style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.4)),
                        ],
                      ),
                    ))
                  else
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('No comments yet.', style: TextStyle(color: AppTheme.textSubtle, fontSize: 12, fontStyle: FontStyle.italic)),
                    ),

                  // Add comment
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: commentCtrl,
                          decoration: InputDecoration(
                            hintText: 'Add your feedback...',
                            hintStyle: TextStyle(color: AppTheme.textSubtle),
                            filled: true,
                            fillColor: AppTheme.backgroundColor,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          ),
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () {
                          if (commentCtrl.text.trim().isNotEmpty) {
                            onAddComment(commentCtrl.text.trim());
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.send, color: Colors.white, size: 18),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFileThumbnail(dynamic file, Color color) {
    final raw = file['url']?.toString();
    final url = ApiConstants.mediaUrl(raw);
    final kind = fileKind(raw);
    final isPdf = kind == 'pdf';
    final isImage = kind == 'image';

    return GestureDetector(
      onTap: () async {
        if (isPdf || !isImage) {
          final uri = Uri.parse(url);
          if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else {
          showDialog(
            context: Get.context!,
            builder: (_) => Dialog(
              backgroundColor: Colors.black,
              insetPadding: const EdgeInsets.all(16),
              child: Stack(
                children: [
                  Center(child: Image.network(url, fit: BoxFit.contain)),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(Get.context!),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      },
      child: Container(
        width: 100,
        height: 100,
        decoration: BoxDecoration(
          color: color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: isPdf
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.picture_as_pdf, color: color, size: 28),
                  const SizedBox(height: 4),
                  Text('PDF', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
                ],
              )
            : isImage
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(url, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Icon(Icons.image, color: color, size: 28),
                    ),
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.insert_drive_file, color: color, size: 28),
                      const SizedBox(height: 4),
                      Text('File', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
      ),
    );
  }
}