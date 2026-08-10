import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../controllers/forum_controller.dart';
import '../../services/api_service.dart';
import '../../utils/api_constants.dart';
import '../../utils/app_notification.dart';
import '../../utils/forum_draft_store.dart';
import '../../utils/theme.dart';

class CreateForumScreen extends StatefulWidget {
  const CreateForumScreen({super.key});

  @override
  State<CreateForumScreen> createState() => _CreateForumScreenState();
}

class _CreateForumScreenState extends State<CreateForumScreen> {
  static const _pickerChannel = MethodChannel('com.pmcfms.mobile/file_picker');

  final ForumController controller = Get.find<ForumController>();
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _category = 'General';
  final List<_AttachedFile> _attachments = [];
  bool _uploading = false;
  bool _draftLoaded = false;
  bool _stagedUploadBusy = false;
  final Set<String> _consumedStagedPaths = {};

  static const _imageExts = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'};

  @override
  void initState() {
    super.initState();
    _pickerChannel.setMethodCallHandler(_onNativeCall);
    _restoreDraftAndStaged();
  }

  @override
  void dispose() {
    _pickerChannel.setMethodCallHandler(null);
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<dynamic> _onNativeCall(MethodCall call) async {
    if (call.method == 'onFilesStaged') {
      final raw = call.arguments?.toString() ?? '';
      await ForumDraftStore.consumeStagedFiles();
      await _uploadStagedList(_parseStagedJson(raw));
    }
  }

  Future<void> _restoreDraftAndStaged() async {
    final draft = await ForumDraftStore.load();
    if (!mounted) return;

    if (draft != null) {
      _titleController.text = (draft['title'] ?? '').toString();
      _descController.text = (draft['description'] ?? '').toString();
      _category = (draft['category'] ?? 'General').toString();
      final rawAtt = draft['attachments'];
      if (rawAtt is List) {
        // Deduplicate draft attachments by URL
        final seenUrls = <String>{};
        _attachments
          ..clear()
          ..addAll(
            rawAtt.map((e) {
              final m = Map<String, dynamic>.from(e as Map);
              return _AttachedFile(
                name: (m['name'] ?? 'file').toString(),
                url: (m['url'] ?? '').toString(),
              );
            }).where((a) {
              if (a.url.isEmpty || seenUrls.contains(a.url)) return false;
              seenUrls.add(a.url);
              return true;
            }),
          );
      }
    }

    setState(() => _draftLoaded = true);

    // Native may finish staging after we reopen (race with system picker)
    await _pollAndUploadStaged();
  }

  Future<void> _pollAndUploadStaged() async {
    for (var i = 0; i < 10; i++) {
      final peeked = await ForumDraftStore.peekStagedFiles();
      if (peeked.isNotEmpty) {
        final staged = await ForumDraftStore.consumeStagedFiles();
        await _uploadStagedList(staged);
        return;
      }
      await Future.delayed(const Duration(milliseconds: 500));
      if (!mounted) return;
    }
  }

  List<Map<String, String>> _parseStagedJson(String raw) {
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => Map<String, String>.from(
                (e as Map).map((k, v) => MapEntry(k.toString(), v.toString())),
              ))
          .where((m) => (m['path'] ?? '').isNotEmpty)
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _uploadStagedList(List<Map<String, String>> staged) async {
    if (staged.isEmpty || !mounted) return;
    if (_stagedUploadBusy) return;

    // Skip paths already uploaded (poll + onFilesStaged can race)
    final fresh = <Map<String, String>>[];
    for (final file in staged) {
      final path = file['path'] ?? '';
      if (path.isEmpty || _consumedStagedPaths.contains(path)) continue;
      _consumedStagedPaths.add(path);
      fresh.add(file);
    }
    if (fresh.isEmpty) return;

    final remaining = 5 - _attachments.length;
    if (remaining <= 0) return;

    _stagedUploadBusy = true;

    // Show files immediately — upload in background
    final toUpload = <_AttachedFile>[];
    for (final file in fresh.take(remaining)) {
      final path = file['path']!;
      final name = file['name'] ?? 'file';
      if (_attachments.any((a) => a.name == name || a.localPath == path)) continue;
      final pending = _AttachedFile(name: name, url: '', localPath: path, uploading: true);
      _attachments.add(pending);
      toUpload.add(pending);
    }
    if (mounted) setState(() => _uploading = toUpload.isNotEmpty);

    try {
      for (final pending in toUpload) {
        final path = pending.localPath!;
        final name = pending.name;
        final url = await ApiService.uploadLocalPath(path, filename: name);
        final idx = _attachments.indexWhere((a) => identical(a, pending) || (a.localPath == path && a.uploading));
        if (!mounted) return;
        if (url != null && idx >= 0) {
          _attachments[idx] = _AttachedFile(name: name, url: url);
          setState(() {});
        } else if (idx >= 0) {
          _attachments.removeAt(idx);
          setState(() {});
          Get.snackbar(
            'Upload failed',
            ApiService.lastUploadError ?? 'Could not upload $name',
            snackPosition: SnackPosition.TOP,
          );
        }
      }
    } finally {
      _stagedUploadBusy = false;
      if (mounted) {
        setState(() => _uploading = _attachments.any((a) => a.uploading));
      }
      await _persistDraft();
    }
  }

  Future<void> _persistDraft() async {
    await ForumDraftStore.save(
      title: _titleController.text,
      description: _descController.text,
      category: _category,
      attachments: _attachments
          .where((a) => a.url.isNotEmpty)
          .map((a) => {'name': a.name, 'url': a.url})
          .toList(),
    );
  }

  bool _isImage(String nameOrUrl) {
    final lower = nameOrUrl.toLowerCase();
    final ext = lower.contains('.') ? lower.split('.').last.split('?').first : '';
    return _imageExts.contains(ext);
  }

  Future<void> _handlePickFiles() async {
    await _persistDraft();
    await ForumDraftStore.markResume();

    String? raw;
    try {
      raw = await _pickerChannel
          .invokeMethod<String>('pickForumFiles')
          .timeout(const Duration(minutes: 3));
    } on PlatformException catch (e) {
      if (!mounted) return;
      Get.snackbar(
        'Picker',
        e.message ?? 'Could not open file picker',
        snackPosition: SnackPosition.TOP,
      );
    } catch (_) {
      // Timeout / Flutter restart — fall through to prefs
      raw = null;
    }

    if (!mounted) return;

    var staged = raw != null && raw.isNotEmpty ? _parseStagedJson(raw) : <Map<String, String>>[];
    if (staged.isEmpty) {
      staged = await ForumDraftStore.consumeStagedFiles();
    } else {
      await ForumDraftStore.consumeStagedFiles();
    }
    await _uploadStagedList(staged);
  }

  void _removeAttachment(int index) {
    setState(() => _attachments.removeAt(index));
    _persistDraft();
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;
    if (_attachments.any((a) => a.uploading)) {
      Get.snackbar('Please wait', 'File is still uploading…', snackPosition: SnackPosition.TOP);
      return;
    }
    final success = await controller.createForum({
      'title': _titleController.text.trim(),
      'description': _descController.text.trim(),
      'category': _category,
      if (_attachments.any((a) => a.url.isNotEmpty))
        'images': _attachments.where((a) => a.url.isNotEmpty).map((a) => a.url).toList(),
    });
    if (success) {
      await ForumDraftStore.clear();
      Get.back();
      // Show after leaving create screen so Get.back() does not dismiss the dialog
      Future.microtask(() {
        AppNotification.success(
          'Forum Created',
          'Your topic was submitted and is pending review',
        );
      });
    }
  }

  Future<void> _onBack() async {
    await ForumDraftStore.clear();
    Get.back();
  }

  @override
  Widget build(BuildContext context) {
    if (!_draftLoaded) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Start a Discussion'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _onBack,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.amber, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Your topic will be reviewed by a moderator before it becomes visible to everyone.',
                        style: TextStyle(color: Colors.amber, fontSize: AppTheme.fontBody),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              _buildLabel('Topic Title'),
              _buildTextField(
                _titleController,
                'What do you want to discuss?',
                validator: (v) => v == null || v.isEmpty ? 'Title is required' : null,
                onChanged: (_) => _persistDraft(),
              ),
              const SizedBox(height: 20),
              _buildLabel('Category'),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _category,
                    isExpanded: true,
                    dropdownColor: AppTheme.surfaceColor,
                    style: TextStyle(color: AppTheme.textPrimary),
                    items: const [
                      DropdownMenuItem(value: 'General', child: Text('General')),
                      DropdownMenuItem(value: 'Infrastructure', child: Text('Infrastructure')),
                      DropdownMenuItem(value: 'Education', child: Text('Education')),
                      DropdownMenuItem(value: 'Healthcare', child: Text('Healthcare')),
                      DropdownMenuItem(value: 'Security', child: Text('Security')),
                    ],
                    onChanged: (v) {
                      setState(() => _category = v ?? 'General');
                      _persistDraft();
                    },
                  ),
                ),
              ),
              const SizedBox(height: 20),
              _buildLabel('Details'),
              _buildTextField(
                _descController,
                'Provide more context for the discussion...',
                maxLines: 5,
                validator: (v) => v == null || v.isEmpty ? 'Description is required' : null,
                onChanged: (_) => _persistDraft(),
              ),
              const SizedBox(height: 20),
              _buildLabel('Attachment (Any File)'),
              Row(
                children: [
                  ElevatedButton(
                    onPressed: _uploading ? null : _handlePickFiles,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFECFDF5),
                      foregroundColor: const Color(0xFF047857),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    ),
                    child: const Text(
                      'Choose Files',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _attachments.isEmpty
                          ? 'No file chosen'
                          : '${_attachments.length} file(s) chosen',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              if (_uploading) ...[
                const SizedBox(height: 12),
                const LinearProgressIndicator(color: AppTheme.primaryColor),
              ],
              if (_attachments.isNotEmpty) ...[
                const SizedBox(height: 12),
                ...List.generate(_attachments.length, (i) {
                  final file = _attachments[i];
                  final isImg = !file.uploading && (_isImage(file.name) || _isImage(file.url));
                  return Container(
                    margin: EdgeInsets.only(bottom: 8),
                    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceColor,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.borderColor),
                    ),
                    child: Row(
                      children: [
                        if (file.uploading)
                          const SizedBox(
                            width: 40,
                            height: 40,
                            child: Padding(
                              padding: EdgeInsets.all(8),
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          )
                        else if (isImg)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: Image.network(
                              ApiConstants.mediaUrl(file.url),
                              width: 40,
                              height: 40,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Icon(
                                Icons.insert_drive_file_outlined,
                                color: AppTheme.textSubtle,
                              ),
                            ),
                          )
                        else
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppTheme.primaryLight,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.insert_drive_file_outlined,
                              color: AppTheme.primaryColor,
                              size: 22,
                            ),
                          ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                file.name,
                                style: TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (file.uploading)
                                Text(
                                  'Uploading…',
                                  style: TextStyle(color: AppTheme.textSubtle, fontSize: 11),
                                ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: file.uploading ? null : () => _removeAttachment(i),
                          icon: Icon(Icons.close, size: 18, color: AppTheme.textSubtle),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                  );
                }),
              ],
              const SizedBox(height: 30),
              Obx(
                () => SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: controller.isSubmitting.value || _uploading ? null : _handleCreate,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 4,
                    ),
                    child: controller.isSubmitting.value
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Text(
                            'Post Topic',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: TextStyle(
          color: AppTheme.textMuted,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController ctrl,
    String hint, {
    int maxLines = 1,
    String? Function(String?)? validator,
    void Function(String)? onChanged,
  }) {
    return TextFormField(
      controller: ctrl,
      maxLines: maxLines,
      validator: validator,
      onChanged: onChanged,
      style: TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppTheme.textSubtle),
        filled: true,
        fillColor: AppTheme.surfaceColor,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: AppTheme.borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}

class _AttachedFile {
  final String name;
  final String url;
  final String? localPath;
  final bool uploading;

  _AttachedFile({
    required this.name,
    required this.url,
    this.localPath,
    this.uploading = false,
  });
}