import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../controllers/issue_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../services/api_service.dart';
import '../../utils/api_constants.dart';
import '../../utils/app_notification.dart';
import '../../utils/issue_draft_store.dart';
import '../../utils/theme.dart';
import '../../utils/status_workflow.dart';

class IssuesScreen extends StatefulWidget {
  final bool openCreateOnStart;

  const IssuesScreen({Key? key, this.openCreateOnStart = false}) : super(key: key);

  @override
  State<IssuesScreen> createState() => _IssuesScreenState();
}

class _IssuesScreenState extends State<IssuesScreen> {
  static const _pickerChannel = MethodChannel('com.pmcfms.mobile/file_picker');

  final IssueController controller = Get.put(IssueController());
  final AuthController authController = Get.find<AuthController>();
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    controller.fetchIssues();
    if (widget.openCreateOnStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showCreateDialog();
      });
    }
  }

  bool get _isAdmin => authController.user['role'] == 'admin' || authController.user['role'] == 'moderator';

  List<dynamic> get _filtered {
    if (_filter == 'all') return controller.issues;
    return controller.issues.where((i) => (i['status'] ?? '').toString().toLowerCase() == _filter.toLowerCase()).toList();
  }

  int _countByStatus(String status) {
    return controller.issues.where((i) => (i['status'] ?? '').toString().toLowerCase() == status.toLowerCase()).length;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Issues & Concerns')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primaryColor,
        onPressed: () => _showCreateDialog(),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                _filterChip('all', 'All'),
                const SizedBox(width: 8),
                _filterChip('pending', 'Pending'),
                const SizedBox(width: 8),
                _filterChip('under review', 'Review'),
                const SizedBox(width: 8),
                _filterChip('resolved', 'Resolved'),
                const SizedBox(width: 8),
                _filterChip('rejected', 'Rejected'),
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
                      Icon(Icons.check_circle_outline, size: 64, color: AppTheme.textSubtle),
                      SizedBox(height: 16),
                      Text('No issues reported', style: TextStyle(color: AppTheme.textMuted, fontSize: 16)),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: () => controller.fetchIssues(),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildStatsSummary(),
                    const SizedBox(height: 16),
                    ...items.map((issue) => _buildCard(issue)),
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
        _statCard('Pending', _countByStatus('pending'), const Color(0xFFF59E0B), Icons.pending_outlined),
        const SizedBox(width: 8),
        _statCard('Review', _countByStatus('under review'), const Color(0xFF3B82F6), Icons.search),
        const SizedBox(width: 8),
        _statCard('Resolved', _countByStatus('resolved'), const Color(0xFF10B981), Icons.check_circle_outline),
        const SizedBox(width: 8),
        _statCard('Rejected', _countByStatus('rejected'), const Color(0xFFF43F5E), Icons.cancel_outlined),
      ],
    );
  }

  Widget _statCard(String label, int count, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: color, size: 16),
            ),
            SizedBox(height: 6),
            Text('$count', style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
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
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: active ? AppTheme.primaryColor : AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: active ? AppTheme.primaryColor : AppTheme.borderColor),
        ),
        child: Text(label, style: TextStyle(color: active ? Colors.white : AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Color _statusColor(String? s) {
    switch (s?.toLowerCase()) {
      case 'resolved': return Colors.green;
      case 'under review': return Colors.orange;
      case 'rejected': return Colors.red;
      case 'pending': return Colors.blue;
      default: return AppTheme.textSubtle;
    }
  }

  Color _statusBarColor(String? s) {
    switch (s?.toLowerCase()) {
      case 'resolved': return Colors.green;
      case 'under review': return Colors.orange;
      case 'rejected': return Colors.red;
      case 'pending': return Colors.blue;
      default: return AppTheme.textSubtle;
    }
  }

  Widget _buildCard(dynamic issue) {
    final status = (issue['status'] ?? 'pending').toString();
    final color = _statusColor(status);
    final barColor = _statusBarColor(status);
    final comments = (issue['comments'] as List?) ?? [];

    return GestureDetector(
      onTap: () => _openDetails(issue),
      child: Container(
        margin: EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: IntrinsicHeight(
          child: Row(
            children: [
              // Left status bar
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: barColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(18),
                    bottomLeft: Radius.circular(18),
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                            child: Text(status, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                          const Spacer(),
                          if (_isAdmin && status != 'Resolved' && status != 'Rejected')
                            GestureDetector(
                              onTap: () => _showAdminUpdate(issue),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(colors: [Color(0xFF0D9488), Color(0xFF06B6D4)]),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Text('Manage', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          if (_isAdmin)
                            GestureDetector(
                              onTap: () => _showEditIssue(issue),
                              child: const Padding(
                                padding: EdgeInsets.only(left: 6),
                                child: Icon(Icons.edit_outlined, color: Color(0xFF0D9488), size: 16),
                              ),
                            ),
                          if (_isAdmin)
                            Padding(
                              padding: const EdgeInsets.only(left: 6),
                              child: GestureDetector(
                                onTap: () => _confirmDelete(issue),
                                child: Icon(Icons.delete_outline, color: Colors.red.shade300, size: 16),
                              ),
                            ),
                        ],
                      ),
                      SizedBox(height: 10),
                      Text(issue['title'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
                      if (issue['description'] != null) ...[
                        SizedBox(height: 6),
                        Text(issue['description'], style: TextStyle(color: AppTheme.textMuted, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                      ],
                      if (issue['adminNotes'] != null && (issue['adminNotes'] as String).isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.green.withOpacity(0.15)),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.shield_outlined, size: 12, color: Colors.green.shade500),
                              const SizedBox(width: 5),
                              Expanded(
                                child: Text(
                                  'Admin: ${issue['adminNotes']}',
                                  style: TextStyle(color: Colors.green.shade600, fontSize: 10),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      SizedBox(height: 10),
                      Container(
                        padding: EdgeInsets.only(top: 10),
                        decoration: BoxDecoration(border: Border(top: BorderSide(color: AppTheme.borderColor, width: 0.5))),
                        child: Row(
                          children: [
                            Icon(Icons.location_on_outlined, size: 12, color: AppTheme.primaryColor),
                            SizedBox(width: 3),
                            Text(issue['district'] ?? '', style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                            Spacer(),
                            Icon(Icons.access_time, size: 11, color: AppTheme.textSubtle),
                            SizedBox(width: 3),
                            Text(
                              issue['createdAt'] != null ? DateFormat('MMM d, yyyy').format(DateTime.parse(issue['createdAt'])) : '',
                              style: TextStyle(color: AppTheme.textSubtle, fontSize: 10),
                            ),
                            SizedBox(width: 10),
                            Icon(Icons.comment_outlined, size: 11, color: AppTheme.textSubtle),
                            SizedBox(width: 3),
                            Text('${comments.length}', style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                            if (issue['citizen'] != null) ...[
                              SizedBox(width: 10),
                              Icon(Icons.person_outline, size: 11, color: AppTheme.textSubtle),
                              SizedBox(width: 3),
                              Flexible(
                                child: Text(
                                  '${issue['citizen']['name'] ?? ''} (${_roleLabel(issue['citizen']['role'])})',
                                  style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _roleLabel(dynamic role) {
    final r = (role ?? 'citizen').toString().toLowerCase();
    if (r == 'admin') return 'Admin';
    if (r == 'moderator') return 'Moderator';
    return 'Citizen';
  }

  void _confirmDelete(dynamic issue) {
    final name = issue['citizen']?['name'] ?? 'Unknown';
    final role = _roleLabel(issue['citizen']?['role']);
    Get.defaultDialog(
      title: 'Delete Issue',
      titleStyle: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
      backgroundColor: AppTheme.surfaceColor,
      middleText: 'Delete this issue?\n\nReported by: $name ($role)\n\nThis cannot be undone.',
      textConfirm: 'Delete',
      textCancel: 'Cancel',
      confirmTextColor: Colors.white,
      buttonColor: Colors.red,
      onConfirm: () async {
        await controller.deleteIssue(issue['_id']);
        Get.back();
        Get.snackbar('Deleted', 'Issue deleted successfully');
      },
    );
  }

  void _showEditIssue(dynamic issue) {
    final titleCtrl = TextEditingController(text: issue['title'] ?? '');
    final descCtrl = TextEditingController(text: issue['description'] ?? '');
    final districtCtrl = TextEditingController(text: issue['district'] ?? '');
    bool saving = false;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Edit Issue'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Reported by: ${issue['citizen']?['name'] ?? 'Unknown'} (${_roleLabel(issue['citizen']?['role'])})',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0D9488)),
                    ),
                    const SizedBox(height: 12),
                    TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Title')),
                    const SizedBox(height: 8),
                    TextField(controller: districtCtrl, decoration: const InputDecoration(labelText: 'District')),
                    const SizedBox(height: 8),
                    TextField(controller: descCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Description')),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: saving ? null : () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: saving
                      ? null
                      : () async {
                          setDialogState(() => saving = true);
                          final ok = await controller.editIssue(issue['_id'], {
                            'title': titleCtrl.text.trim(),
                            'description': descCtrl.text.trim(),
                            'district': districtCtrl.text.trim(),
                          });
                          if (!context.mounted) return;
                          Navigator.pop(ctx);
                          if (ok) {
                            AppNotification.success('Saved', 'Issue updated.');
                          }
                        },
                  child: saving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _openDetails(dynamic issue) {
    final commentCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _IssueDetailsSheet(
        issue: issue,
        isAdmin: _isAdmin,
        commentCtrl: commentCtrl,
        onAddComment: (text) async {
          final updated = await controller.addComment(issue['_id'], text);
          if (updated != null && mounted) {
            Navigator.pop(context);
            _openDetails(updated);
          }
        },
        onManage: () {
          Navigator.pop(context);
          _showAdminUpdate(issue);
        },
      ),
    );
  }

  void _showAdminUpdate(dynamic issue) {
    final currentStatus = (issue['status'] ?? 'Pending').toString();
    final next = StatusWorkflow.nextIssueStatus(currentStatus);
    final canReject = StatusWorkflow.canRejectIssue(currentStatus);
    final notesCtrl = TextEditingController(text: issue['adminNotes'] ?? '');
    bool saving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              backgroundColor: Colors.white,
              insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              clipBehavior: Clip.antiAlias,
              child: ConstrainedBox(
                constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(20, 18, 12, 18),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF10B981), Color(0xFF0D9488)],
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.shield_outlined, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Text(
                              'Issue Audit',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: saving ? null : () => Navigator.pop(ctx),
                            icon: const Icon(Icons.close, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                    Flexible(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFF0FDFA), Color(0xFFECFDF5)],
                                ),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFF99F6E4).withValues(alpha: 0.6)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'MANAGING',
                                    style: TextStyle(
                                      color: Color(0xFF0F766E),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    issue['title'] ?? '',
                                    style: const TextStyle(
                                      color: Color(0xFF0F172A),
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
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
                            _IssueAuditTrail(current: currentStatus),
                            if (next != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Next step: → $next',
                                style: const TextStyle(
                                  color: Color(0xFF0D9488),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),
                            const Text(
                              'ADMIN RESPONSE',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.7,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: notesCtrl,
                              maxLines: 4,
                              enabled: !saving,
                              decoration: InputDecoration(
                                hintText: 'Write a response about this issue...',
                                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                                filled: true,
                                fillColor: const Color(0xFFF8FAFC),
                                contentPadding: const EdgeInsets.all(14),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 1.5),
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            Row(
                              children: [
                                Expanded(
                                  child: DecoratedBox(
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(14),
                                      gradient: const LinearGradient(
                                        colors: [Color(0xFF10B981), Color(0xFF0D9488)],
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFF10B981).withValues(alpha: 0.3),
                                          blurRadius: 12,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: ElevatedButton(
                                      onPressed: saving || next == null
                                          ? null
                                          : () async {
                                              setDialogState(() => saving = true);
                                              final success = await controller.updateIssueStatus(
                                                issue['_id'],
                                                action: 'advance',
                                                adminNotes: notesCtrl.text.trim(),
                                              );
                                              if (!context.mounted) return;
                                              Navigator.pop(ctx);
                                              if (success) {
                                                AppNotification.success(
                                                  'Advanced',
                                                  'Issue moved to $next.',
                                                );
                                              }
                                            },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.transparent,
                                        shadowColor: Colors.transparent,
                                        disabledBackgroundColor: Colors.transparent,
                                        padding: const EdgeInsets.symmetric(vertical: 14),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      ),
                                      child: saving
                                          ? const SizedBox(
                                              width: 18,
                                              height: 18,
                                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                            )
                                          : Text(
                                              next == null ? 'Audit complete' : 'Advance to $next',
                                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                                              textAlign: TextAlign.center,
                                            ),
                                    ),
                                  ),
                                ),
                                if (canReject) ...[
                                  const SizedBox(width: 10),
                                  ElevatedButton(
                                    onPressed: saving
                                        ? null
                                        : () async {
                                            setDialogState(() => saving = true);
                                            final success = await controller.updateIssueStatus(
                                              issue['_id'],
                                              action: 'reject',
                                              adminNotes: notesCtrl.text.trim().isNotEmpty
                                                  ? notesCtrl.text.trim()
                                                  : 'This issue was rejected by the moderation team.',
                                            );
                                            if (!context.mounted) return;
                                            Navigator.pop(ctx);
                                            if (success) {
                                              AppNotification.success(
                                                'Issue Rejected',
                                                'The issue has been marked as Rejected.',
                                                icon: Icons.cancel_rounded,
                                              );
                                            }
                                          },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFEF4444),
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    ),
                                    child: const Text(
                                      'Reject',
                                      style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ],
                              ],
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

  Widget _fieldLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.8,
          color: Color(0xFF64748B),
        ),
      ),
    );
  }

  InputDecoration _issueFieldDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  void _showCreateDialog() async {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final districtCtrl = TextEditingController(text: 'Banadir');
    String? imageUrl;
    String? localPath;
    String? localName;
    bool uploading = false;
    String? errorMsg;
    var didScheduleStaged = false;

    final draft = await IssueDraftStore.load();
    if (draft != null) {
      titleCtrl.text = (draft['title'] ?? '').toString();
      descCtrl.text = (draft['description'] ?? '').toString();
      districtCtrl.text = (draft['district'] ?? 'Banadir').toString();
      final savedUrl = (draft['imageUrl'] ?? '').toString();
      if (savedUrl.isNotEmpty) imageUrl = savedUrl;
      final savedLocal = (draft['localPath'] ?? '').toString();
      final savedName = (draft['localName'] ?? '').toString();
      if (savedLocal.isNotEmpty && File(savedLocal).existsSync()) {
        localPath = savedLocal;
        localName = savedName.isNotEmpty ? savedName : savedLocal.split(RegExp(r'[\\/]')).last;
      }
    }

    Future<void> persistDraft() async {
      await IssueDraftStore.save(
        title: titleCtrl.text,
        description: descCtrl.text,
        district: districtCtrl.text,
        imageUrl: imageUrl,
        localPath: localPath,
        localName: localName,
      );
    }

    Future<void> applyStaged(
      List<Map<String, String>> staged,
      void Function(void Function()) setDialogState,
    ) async {
      if (staged.isEmpty) return;
      final path = staged.first['path'] ?? '';
      final name = staged.first['name'] ?? 'photo.jpg';
      if (path.isEmpty || !File(path).existsSync()) return;

      setDialogState(() {
        localPath = path;
        localName = name;
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
          errorMsg = ApiService.lastUploadError ?? 'Upload failed — try again';
        }
      });
      await persistDraft();
    }

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            if (!didScheduleStaged) {
              didScheduleStaged = true;
              WidgetsBinding.instance.addPostFrameCallback((_) async {
                final staged = await IssueDraftStore.consumeStagedFiles();
                if (staged.isNotEmpty && context.mounted) {
                  await applyStaged(staged, setDialogState);
                }
              });
            }

            Widget photoPreview() {
              if (uploading) {
                return const Center(child: CircularProgressIndicator());
              }
              if (localPath != null && File(localPath!).existsSync()) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.file(File(localPath!), fit: BoxFit.cover),
                      if (imageUrl != null)
                        Positioned(
                          left: 8,
                          bottom: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('Ready', style: TextStyle(color: Colors.white, fontSize: 10)),
                          ),
                        ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: GestureDetector(
                          onTap: () async {
                            setDialogState(() {
                              imageUrl = null;
                              localPath = null;
                              localName = null;
                            });
                            await persistDraft();
                          },
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                            child: const Icon(Icons.close, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }
              if (imageUrl != null) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        ApiConstants.mediaUrl(imageUrl),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.image, size: 40)),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: GestureDetector(
                          onTap: () async {
                            setDialogState(() => imageUrl = null);
                            await persistDraft();
                          },
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                            child: const Icon(Icons.close, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }
              return const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.upload_rounded, size: 22, color: Color(0xFF94A3B8)),
                  SizedBox(height: 6),
                  Text(
                    'Click to upload a photo of the issue',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ],
              );
            }

            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              backgroundColor: AppTheme.surfaceColor,
              insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              clipBehavior: Clip.antiAlias,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(height: 4, width: double.infinity, color: const Color(0xFFEF4444)),
                    Flexible(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.priority_high, color: Colors.white, size: 18),
                                ),
                                const SizedBox(width: 10),
                                const Expanded(
                                  child: Text(
                                    'Submit New Issue / Feedback',
                                    style: TextStyle(
                                      color: Color(0xFF0F172A),
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  onPressed: () async {
                                    await IssueDraftStore.clear();
                                    if (context.mounted) Navigator.pop(context);
                                  },
                                  icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            const SizedBox(height: 16),
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
                                  style: const TextStyle(color: Color(0xFFEF4444), fontSize: 14, fontWeight: FontWeight.w500),
                                ),
                              ),
                            _fieldLabel('ISSUE TITLE'),
                            TextField(
                              controller: titleCtrl,
                              onChanged: (_) => persistDraft(),
                              decoration: _issueFieldDecoration('e.g. Broken water pipe on First Avenue'),
                            ),
                            const SizedBox(height: 16),
                            _fieldLabel('DISTRICT / NEIGHBORHOOD'),
                            TextField(
                              controller: districtCtrl,
                              onChanged: (_) => persistDraft(),
                              decoration: _issueFieldDecoration('e.g. Banadir, Hodan, Waberi...'),
                            ),
                            const SizedBox(height: 16),
                            _fieldLabel('ISSUE DETAILS'),
                            TextField(
                              controller: descCtrl,
                              maxLines: 4,
                              onChanged: (_) => persistDraft(),
                              decoration: _issueFieldDecoration('Write the issue details so authorities can address it...'),
                            ),
                            const SizedBox(height: 16),
                            _fieldLabel('ATTACH PHOTO (OPTIONAL)'),
                            GestureDetector(
                              onTap: uploading
                                  ? null
                                  : () async {
                                      await persistDraft();
                                      await IssueDraftStore.markResume();
                                      try {
                                        final raw = await _pickerChannel.invokeMethod<String>('pickIssueImage');
                                        if (raw != null && raw.isNotEmpty) {
                                          final decoded = jsonDecode(raw);
                                          if (decoded is List && decoded.isNotEmpty) {
                                            final staged = decoded
                                                .map((e) => Map<String, String>.from(
                                                      (e as Map).map((k, v) => MapEntry(k.toString(), v.toString())),
                                                    ))
                                                .toList();
                                            await applyStaged(staged, setDialogState);
                                          }
                                        }
                                      } catch (_) {
                                        setDialogState(() => errorMsg = 'Could not open photo picker');
                                      }
                                    },
                              child: Container(
                                width: double.infinity,
                                height: 96,
                                decoration: BoxDecoration(
                                  color: (imageUrl != null || localPath != null)
                                      ? const Color(0xFFD1FAE5)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: (imageUrl != null || localPath != null)
                                        ? AppTheme.primaryColor
                                        : const Color(0xFFE2E8F0),
                                    width: (imageUrl != null || localPath != null) ? 1.5 : 2,
                                  ),
                                ),
                                child: photoPreview(),
                              ),
                            ),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(14),
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF14B8A6), Color(0xFF06B6D4)],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF14B8A6).withValues(alpha: 0.25),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ElevatedButton.icon(
                                  onPressed: uploading
                                      ? null
                                      : () async {
                                          if (titleCtrl.text.trim().isEmpty ||
                                              descCtrl.text.trim().isEmpty ||
                                              districtCtrl.text.trim().isEmpty) {
                                            setDialogState(() => errorMsg = 'Title, district and details are required');
                                            return;
                                          }
                                          if (localPath != null && imageUrl == null) {
                                            setDialogState(() => errorMsg = 'Photo is still uploading — wait a moment');
                                            return;
                                          }
                                          setDialogState(() => errorMsg = null);
                                          final success = await controller.createIssue({
                                            'title': titleCtrl.text.trim(),
                                            'description': descCtrl.text.trim(),
                                            'district': districtCtrl.text.trim(),
                                            if (imageUrl != null) 'imageUrl': imageUrl,
                                          });
                                          if (success) {
                                            await IssueDraftStore.clear();
                                            if (context.mounted) Navigator.pop(context);
                                            AppNotification.success('Issue Submitted', 'Your issue was sent successfully.');
                                          }
                                        },
                                  icon: const Icon(Icons.send_rounded, size: 18, color: Colors.white),
                                  label: const Text(
                                    'Submit Issue',
                                    style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    elevation: 0,
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

class _IssueDetailsSheet extends StatelessWidget {
  final dynamic issue;
  final bool isAdmin;
  final TextEditingController commentCtrl;
  final Function(String) onAddComment;
  final VoidCallback onManage;

  const _IssueDetailsSheet({
    required this.issue,
    required this.isAdmin,
    required this.commentCtrl,
    required this.onAddComment,
    required this.onManage,
  });

  Color _statusColor(String? s) {
    switch (s?.toLowerCase()) {
      case 'resolved': return Colors.green;
      case 'under review': return Colors.orange;
      case 'rejected': return Colors.red;
      case 'pending': return Colors.blue;
      default: return AppTheme.textSubtle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final comments = (issue['comments'] as List?) ?? [];
    final status = issue['status'] ?? 'Pending';
    final color = _statusColor(status);
    final isUnderReview = status == 'Under Review';
    final isRejected = status == 'Rejected';

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
                  Icon(Icons.report_outlined, color: AppTheme.primaryColor, size: 20),
                  SizedBox(width: 8),
                  Text('Issue Details', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  if (isAdmin)
                    GestureDetector(
                      onTap: onManage,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF0D9488), Color(0xFF06B6D4)]),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text('Manage', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  SizedBox(width: 8),
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
                  Text(issue['title'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                        child: Text(status, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                      SizedBox(width: 8),
                      Icon(Icons.location_on_outlined, size: 14, color: AppTheme.primaryColor),
                      SizedBox(width: 3),
                      Text(issue['district'] ?? '', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      SizedBox(width: 12),
                      Icon(Icons.access_time, size: 12, color: AppTheme.textSubtle),
                      SizedBox(width: 3),
                      Text(
                        issue['createdAt'] != null ? DateFormat('MMM d, yyyy').format(DateTime.parse(issue['createdAt'])) : '',
                        style: TextStyle(color: AppTheme.textSubtle, fontSize: 11),
                      ),
                    ],
                  ),
                  if (issue['description'] != null) ...[
                    SizedBox(height: 14),
                    Text(issue['description'], style: TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.5)),
                  ],
                  // Image
                  if (issue['imageUrl'] != null && (issue['imageUrl'] as String).isNotEmpty) ...[
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: () async {
                        final url = ApiConstants.mediaUrl(issue['imageUrl']);
                        if (await canLaunchUrl(Uri.parse(url))) {
                          await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                        }
                      },
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.network(
                          ApiConstants.mediaUrl(issue['imageUrl']),
                          width: double.infinity,
                          height: 200,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            height: 100,
                            decoration: BoxDecoration(
                              color: AppTheme.backgroundColor,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Center(child: Icon(Icons.broken_image, color: AppTheme.textSubtle, size: 30)),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Center(
                        child: Text('Tap to view full image', style: TextStyle(color: AppTheme.primaryColor, fontSize: 10)),
                      ),
                    ),
                  ],
                  // Admin notes
                  if (issue['adminNotes'] != null && (issue['adminNotes'] as String).isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.green.withOpacity(0.15)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.shield_outlined, size: 14, color: Colors.green.shade500),
                              const SizedBox(width: 5),
                              Text('Official Response', style: TextStyle(color: Colors.green.shade600, fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          SizedBox(height: 8),
                          Text(issue['adminNotes'], style: TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.4)),
                        ],
                      ),
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
                      Text('Discussion (${comments.length})', style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
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
                                c['createdAt'] != null ? DateFormat('MMM d, HH:mm').format(DateTime.parse(c['createdAt'])) : '',
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
                  if (isUnderReview)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.orange.withOpacity(0.2)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.lock_outline, size: 14, color: Colors.orange.shade500),
                          const SizedBox(width: 6),
                          Text('Comments locked while Under Review', style: TextStyle(color: Colors.orange.shade600, fontSize: 11, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    )
                  else if (isRejected)
                    Container(
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.backgroundColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text('Comments disabled for rejected issues', style: TextStyle(color: AppTheme.textSubtle, fontSize: 11, fontStyle: FontStyle.italic)),
                      ),
                    )
                  else
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: commentCtrl,
                            decoration: InputDecoration(
                              hintText: 'Share a detail or update...',
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
}

class _IssueAuditTrail extends StatelessWidget {
  final String current;
  const _IssueAuditTrail({required this.current});

  @override
  Widget build(BuildContext context) {
    final isRejected = current == 'Rejected';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (var i = 0; i < StatusWorkflow.issueFlow.length; i++) ...[
              if (i > 0)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Icon(Icons.arrow_forward, size: 12, color: Color(0xFF94A3B8)),
                ),
              _chip(
                StatusWorkflow.issueFlow[i],
                active: !isRejected && current == StatusWorkflow.issueFlow[i],
                done: !isRejected &&
                    StatusWorkflow.issueFlow.indexOf(current) >
                        StatusWorkflow.issueFlow.indexOf(StatusWorkflow.issueFlow[i]),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        _chip('Rejected (branch)', active: isRejected, done: false, reject: true),
      ],
    );
  }

  Widget _chip(String label, {required bool active, required bool done, bool reject = false}) {
    Color bg;
    Color fg;
    if (active) {
      bg = reject ? const Color(0xFFEF4444) : const Color(0xFF0D9488);
      fg = Colors.white;
    } else if (done) {
      bg = const Color(0xFFCCFBF1);
      fg = const Color(0xFF0F766E);
    } else {
      bg = const Color(0xFFF1F5F9);
      fg = const Color(0xFF94A3B8);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '${done ? '✓ ' : ''}$label',
        style: TextStyle(color: fg, fontSize: 10, fontWeight: FontWeight.w700),
      ),
    );
  }
}