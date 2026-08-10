import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import '../../controllers/document_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../services/api_service.dart';
import '../../utils/api_constants.dart';
import '../../utils/app_notification.dart';
import '../../utils/document_draft_store.dart';
import '../../utils/theme.dart';

class DocumentsScreen extends StatefulWidget {
  final bool openUploadOnStart;

  const DocumentsScreen({super.key, this.openUploadOnStart = false});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  static const _pickerChannel = MethodChannel('com.pmcfms.mobile/file_picker');

  final DocumentController controller = Get.put(DocumentController());
  final AuthController authController = Get.find<AuthController>();
  String? _error;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    controller.fetchDocuments();
    if (widget.openUploadOnStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showUploadDialog();
      });
    }
  }

  bool get _canManage =>
      authController.user['role'] == 'admin' || authController.user['role'] == 'moderator';

  Color _catColor(String? cat) {
    switch (cat) {
      case 'Budget':
        return const Color(0xFF10B981);
      case 'Minutes':
        return const Color(0xFF6366F1);
      case 'Policy':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF64748B);
    }
  }

  Color _catBg(String? cat) => _catColor(cat).withValues(alpha: 0.1);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Document Library'),
        actions: [
          if (_canManage)
            IconButton(
              icon: const Icon(Icons.upload_file, color: AppTheme.primaryColor),
              onPressed: _showUploadDialog,
            ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
        }
        final items = controller.documents;
        if (items.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'No documents uploaded yet.\nDocuments will appear here once they are added.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.textMuted),
              ),
            ),
          );
        }
        return RefreshIndicator(
          color: AppTheme.primaryColor,
          onRefresh: () => controller.fetchDocuments(),
          child: GridView.builder(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              // Taller cards — Open + Download stacked
              childAspectRatio: 0.58,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: items.length,
            itemBuilder: (context, index) => _buildCard(items[index]),
          ),
        );
      }),
    );
  }

  Widget _buildCard(dynamic doc) {
    final cat = doc['category'] ?? 'Other';
    final color = _catColor(cat);
    final url = doc['fileUrl'] ?? doc['url'] ?? '';
    final fullUrl = ApiConstants.mediaUrl(url.toString());
    final desc = (doc['description'] ?? '').toString();

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.borderColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(height: 4, color: color),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: _catBg(cat),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.description_outlined, color: color, size: 18),
                      ),
                      const Spacer(),
                      if (_canManage)
                        PopupMenuButton(
                          padding: EdgeInsets.zero,
                          iconSize: 18,
                          icon: Icon(Icons.more_vert, color: AppTheme.textSubtle, size: 18),
                          itemBuilder: (_) => [
                            const PopupMenuItem(
                              value: 'delete',
                              child: Row(
                                children: [
                                  Icon(Icons.delete_outline, color: Colors.red, size: 16),
                                  SizedBox(width: 8),
                                  Text('Delete', style: TextStyle(color: Colors.red)),
                                ],
                              ),
                            ),
                          ],
                          onSelected: (v) async {
                            if (v == 'delete') await controller.deleteDocument(doc['_id']);
                          },
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: _catBg(cat),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      cat,
                      style: TextStyle(
                        color: color,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    doc['title'] ?? 'Untitled',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      height: 1.2,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (desc.isNotEmpty) ...[
                    SizedBox(height: 4),
                    Text(
                      desc,
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 11, height: 1.25),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  Spacer(),
                  Divider(height: 12, color: AppTheme.borderColor),
                  if (doc['createdAt'] != null || doc['fileSize'] != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (doc['createdAt'] != null)
                            Text(
                              DateFormat('MMM d, yyyy').format(DateTime.parse(doc['createdAt'])),
                              style: TextStyle(color: AppTheme.textSubtle, fontSize: 10),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          if (doc['fileSize'] != null)
                            Text(
                              'Size: ${doc['fileSize']}',
                              style: TextStyle(color: AppTheme.textSubtle, fontSize: 10),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  Row(
                    children: [
                      Expanded(
                        child: _docActionButton(
                          label: 'Open',
                          icon: Icons.visibility_outlined,
                          color: color,
                          filled: false,
                          onTap: () => _openDocument(
                            fullUrl,
                            title: (doc['title'] ?? 'document').toString(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _docActionButton(
                          label: 'Download',
                          icon: Icons.download,
                          color: color,
                          filled: true,
                          onTap: () => _downloadDocument(
                            fullUrl,
                            title: (doc['title'] ?? 'document').toString(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _docActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required bool filled,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 4),
          decoration: BoxDecoration(
            color: filled ? color : color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
            border: filled ? null : Border.all(color: color.withValues(alpha: 0.35)),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: filled ? Colors.white : color, size: 13),
                const SizedBox(width: 3),
                Text(
                  label,
                  style: TextStyle(
                    color: filled ? Colors.white : color,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _fileNameFromUrl(String url, String title) {
    final fromUrl = Uri.parse(url).pathSegments.isNotEmpty
        ? Uri.parse(url).pathSegments.last
        : '';
    final urlName = fromUrl.contains('.') ? fromUrl : '';
    if (urlName.isNotEmpty) {
      final ext = urlName.contains('.') ? '.${urlName.split('.').last}' : '';
      final safeTitle = title.replaceAll(RegExp(r'[^\w\s.-]'), '').trim();
      if (safeTitle.isNotEmpty) {
        return '${safeTitle.replaceAll(RegExp(r'\s+'), '_')}$ext';
      }
      return urlName;
    }
    final safe = title.replaceAll(RegExp(r'[^\w\s.-]'), '').trim().replaceAll(RegExp(r'\s+'), '_');
    return safe.isEmpty ? 'document.pdf' : '$safe.pdf';
  }

  Future<Uint8List?> _fetchBytes(String url) async {
    final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 60));
    if (res.statusCode != 200) {
      Get.snackbar('Error', 'Could not download document (${res.statusCode})');
      return null;
    }
    return res.bodyBytes;
  }

  /// Open in a viewer (does not save to Downloads).
  Future<void> _openDocument(String url, {String? title}) async {
    if (url.isEmpty) {
      Get.snackbar('Error', 'Document link is missing');
      return;
    }

    Get.showSnackbar(const GetSnackBar(
      message: 'Opening document...',
      duration: Duration(seconds: 2),
      snackPosition: SnackPosition.BOTTOM,
    ));

    try {
      final bytes = await _fetchBytes(url);
      if (bytes == null) return;

      final dir = await getTemporaryDirectory();
      final name = _fileNameFromUrl(url, title ?? 'document');
      final file = File('${dir.path}/$name');
      await file.writeAsBytes(bytes, flush: true);

      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done) {
        Get.snackbar(
          'Error',
          result.message.isNotEmpty ? result.message : 'Cannot open document',
        );
      }
    } catch (e) {
      Get.snackbar('Error', 'Cannot open document');
    }
  }

  /// Save into the phone Downloads folder (does not open).
  Future<void> _downloadDocument(String url, {String? title}) async {
    if (url.isEmpty) {
      Get.snackbar('Error', 'Document link is missing');
      return;
    }

    Get.showSnackbar(const GetSnackBar(
      message: 'Downloading…',
      duration: Duration(seconds: 2),
      snackPosition: SnackPosition.BOTTOM,
    ));

    try {
      final bytes = await _fetchBytes(url);
      if (bytes == null) return;

      final name = _fileNameFromUrl(url, title ?? 'document');
      const channel = MethodChannel('com.pmcfms.mobile/downloads');
      final saved = await channel.invokeMethod<String>('saveToDownloads', {
        'bytes': bytes,
        'filename': name,
      });

      AppNotification.success(
        'Downloaded',
        saved != null && saved.isNotEmpty
            ? 'Saved to Downloads as $saved'
            : 'Saved to Downloads',
      );
    } on PlatformException catch (e) {
      Get.snackbar('Error', e.message ?? 'Download failed');
    } catch (e) {
      Get.snackbar('Error', 'Download failed');
    }
  }

  InputDecoration _fieldDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppTheme.textSubtle, fontSize: 14),
      filled: true,
      fillColor: const Color(0xFFF1F5F9),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    );
  }

  Widget _fieldLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.6,
          color: Color(0xFF64748B),
        ),
      ),
    );
  }

  Future<void> _showUploadDialog() async {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String category = 'Policy';
    _LocalPickedFile? selectedFile;
    _error = null;
    _uploading = false;

    final draft = await DocumentDraftStore.load();
    if (draft != null) {
      titleCtrl.text = (draft['title'] ?? '').toString();
      descCtrl.text = (draft['description'] ?? '').toString();
      category = (draft['category'] ?? 'Policy').toString();
    }

    final staged = await DocumentDraftStore.consumeStagedFiles();
    if (staged.isNotEmpty) {
      final path = staged.first['path']!;
      final name = staged.first['name'] ?? 'file';
      final file = File(path);
      if (await file.exists()) {
        selectedFile = _LocalPickedFile(
          name: name,
          path: path,
          size: await file.length(),
        );
        if (titleCtrl.text.isEmpty) {
          titleCtrl.text = name.replaceAll(RegExp(r'\.[^/.]+$'), '');
        }
      }
    }

    if (!mounted) return;

    var didSchedulePoll = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> persistDraft() async {
              await DocumentDraftStore.save(
                title: titleCtrl.text,
                description: descCtrl.text,
                category: category,
              );
            }

            Future<void> pickFile() async {
              await persistDraft();
              await DocumentDraftStore.markResume();

              String? raw;
              try {
                raw = await _pickerChannel
                    .invokeMethod<String>('pickDocumentFile')
                    .timeout(const Duration(minutes: 3));
              } on PlatformException catch (e) {
                if (dialogContext.mounted) {
                  setDialogState(() => _error = e.message ?? 'Could not open file picker');
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
                await DocumentDraftStore.consumeStagedFiles();
              } else {
                for (var i = 0; i < 10; i++) {
                  final peeked = await DocumentDraftStore.peekStagedFiles();
                  if (peeked.isNotEmpty) {
                    stagedList = await DocumentDraftStore.consumeStagedFiles();
                    break;
                  }
                  await Future.delayed(const Duration(milliseconds: 500));
                  if (!dialogContext.mounted) return;
                }
              }

              if (!dialogContext.mounted || stagedList.isEmpty) return;
              final path = stagedList.first['path'] ?? '';
              final name = stagedList.first['name'] ?? 'file';
              final file = File(path);
              if (!await file.exists()) return;

              setDialogState(() {
                selectedFile = _LocalPickedFile(
                  name: name,
                  path: path,
                  size: file.lengthSync(),
                );
                if (titleCtrl.text.isEmpty) {
                  titleCtrl.text = name.replaceAll(RegExp(r'\.[^/.]+$'), '');
                }
                _error = null;
              });
              await persistDraft();
            }

            if (selectedFile == null && widget.openUploadOnStart && !didSchedulePoll) {
              didSchedulePoll = true;
              WidgetsBinding.instance.addPostFrameCallback((_) async {
                for (var i = 0; i < 10; i++) {
                  if (!dialogContext.mounted || selectedFile != null) return;
                  final peeked = await DocumentDraftStore.peekStagedFiles();
                  if (peeked.isNotEmpty) {
                    final list = await DocumentDraftStore.consumeStagedFiles();
                    final path = list.first['path'] ?? '';
                    final name = list.first['name'] ?? 'file';
                    final file = File(path);
                    if (await file.exists()) {
                      setDialogState(() {
                        selectedFile = _LocalPickedFile(
                          name: name,
                          path: path,
                          size: file.lengthSync(),
                        );
                        if (titleCtrl.text.isEmpty) {
                          titleCtrl.text = name.replaceAll(RegExp(r'\.[^/.]+$'), '');
                        }
                      });
                    }
                    return;
                  }
                  await Future.delayed(const Duration(milliseconds: 500));
                }
              });
            }

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
                          const Icon(Icons.description_outlined, color: Color(0xFF10B981), size: 22),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Upload New Document',
                              style: TextStyle(
                                color: Color(0xFF0F172A),
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: _uploading
                                ? null
                                : () async {
                                    await DocumentDraftStore.clear();
                                    if (dialogContext.mounted) Navigator.pop(dialogContext);
                                  },
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
                            if (_error != null) ...[
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEE2E2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  _error!,
                                  style: const TextStyle(
                                    color: Color(0xFFEF4444),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                            _fieldLabel('DOCUMENT TITLE'),
                            TextField(
                              controller: titleCtrl,
                              textInputAction: TextInputAction.next,
                              onChanged: (_) => persistDraft(),
                              decoration: _fieldDecoration('e.g. Banadir District Budget 2026'),
                            ),
                            const SizedBox(height: 14),
                            _fieldLabel('CATEGORY'),
                            DropdownButtonFormField<String>(
                              value: category,
                              decoration: _fieldDecoration(''),
                              icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF64748B)),
                              items: const [
                                DropdownMenuItem(value: 'Policy', child: Text('Policy')),
                              ],
                              onChanged: (v) {
                                setDialogState(() => category = v ?? 'Policy');
                                persistDraft();
                              },
                            ),
                            const SizedBox(height: 14),
                            _fieldLabel('UPLOAD FILE'),
                            GestureDetector(
                              onTap: _uploading ? null : pickFile,
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 16),
                                decoration: BoxDecoration(
                                  color: selectedFile != null
                                      ? const Color(0xFFD1FAE5)
                                      : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: selectedFile != null
                                        ? AppTheme.primaryColor
                                        : const Color(0xFFCBD5E1),
                                    width: 1.5,
                                  ),
                                ),
                                child: selectedFile != null
                                    ? Row(
                                        children: [
                                          const Icon(Icons.check_circle,
                                              color: AppTheme.primaryColor, size: 24),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  selectedFile!.name,
                                                  style: const TextStyle(
                                                    color: Color(0xFF334155),
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                                Text(
                                                  '${(selectedFile!.size / (1024 * 1024)).toStringAsFixed(2)} MB',
                                                  style: const TextStyle(
                                                    color: Color(0xFF64748B),
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      )
                                    : const Column(
                                        children: [
                                          Icon(Icons.cloud_upload_outlined,
                                              size: 32, color: Color(0xFF94A3B8)),
                                          SizedBox(height: 8),
                                          Text(
                                            'Click to upload or drag & drop',
                                            style: TextStyle(
                                              color: Color(0xFF334155),
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          SizedBox(height: 4),
                                          Text(
                                            'Any file type (Max 25MB)',
                                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            _fieldLabel('DESCRIPTION (OPTIONAL)'),
                            TextField(
                              controller: descCtrl,
                              maxLines: 3,
                              onChanged: (_) => persistDraft(),
                              decoration: _fieldDecoration('Brief description of this document...'),
                            ),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(14),
                                  gradient: _uploading
                                      ? null
                                      : const LinearGradient(
                                          colors: [Color(0xFF10B981), Color(0xFF8B5CF6)],
                                        ),
                                  color: _uploading ? const Color(0xFF94A3B8) : null,
                                ),
                                child: ElevatedButton(
                                  onPressed: _uploading
                                      ? null
                                      : () async {
                                          if (titleCtrl.text.trim().isEmpty) {
                                            setDialogState(
                                                () => _error = 'Document title is required');
                                            return;
                                          }
                                          if (selectedFile == null) {
                                            setDialogState(
                                                () => _error = 'Please select a file');
                                            return;
                                          }
                                          setDialogState(() {
                                            _error = null;
                                            _uploading = true;
                                          });
                                          final uploadUrl = await ApiService.uploadLocalPath(
                                            selectedFile!.path,
                                            filename: selectedFile!.name,
                                          );
                                          if (uploadUrl == null) {
                                            setDialogState(() {
                                              _error = ApiService.lastUploadError ??
                                                  'Failed to upload file';
                                              _uploading = false;
                                            });
                                            return;
                                          }
                                          final sizeStr = selectedFile!.size < 1024 * 1024
                                              ? '${(selectedFile!.size / 1024).toStringAsFixed(1)} KB'
                                              : '${(selectedFile!.size / (1024 * 1024)).toStringAsFixed(1)} MB';
                                          final success = await controller.uploadDocument({
                                            'title': titleCtrl.text.trim(),
                                            'description': descCtrl.text.trim(),
                                            'fileUrl': uploadUrl,
                                            'fileSize': sizeStr,
                                            'category': category,
                                          });
                                          setDialogState(() => _uploading = false);
                                          if (success) {
                                            await DocumentDraftStore.clear();
                                            if (dialogContext.mounted) {
                                              Navigator.pop(dialogContext);
                                            }
                                            AppNotification.success(
                                              'Document Saved',
                                              'Document uploaded successfully',
                                            );
                                          } else {
                                            setDialogState(
                                                () => _error = 'Failed to save document');
                                          }
                                        },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    disabledBackgroundColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  child: Text(
                                    _uploading ? 'Saving & Uploading...' : 'Save Document',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
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

class _LocalPickedFile {
  final String name;
  final String path;
  final int size;
  _LocalPickedFile({required this.name, required this.path, required this.size});
}