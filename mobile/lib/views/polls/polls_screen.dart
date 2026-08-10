import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../controllers/poll_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/app_notification.dart';
import '../../utils/theme.dart';

class PollsScreen extends StatefulWidget {
  const PollsScreen({super.key});
  @override
  State<PollsScreen> createState() => _PollsScreenState();
}

class _PollsScreenState extends State<PollsScreen> {
  final PollController controller = Get.put(PollController());
  final AuthController authCtrl = Get.find<AuthController>();
  String _filter = 'all';

  bool get _isAdmin => authCtrl.user['role'] == 'admin' || authCtrl.user['role'] == 'moderator';

  @override
  void initState() {
    super.initState();
    controller.fetchPolls();
  }

  List<dynamic> get _filteredPolls {
    if (_filter == 'open') return controller.polls.where((p) => p['isOpen'] == true || p['status'] == 'open').toList();
    if (_filter == 'closed') return controller.polls.where((p) => p['isOpen'] == false || p['status'] == 'closed').toList();
    return controller.polls;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Polls'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: AppTheme.primaryColor),
            onPressed: () => _showCreatePollDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Stats Row
          Obx(() => Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                _statCard('Total', '${controller.totalPolls}', Colors.blue, Icons.how_to_vote_outlined),
                const SizedBox(width: 8),
                _statCard('Open', '${controller.openCount}', Colors.green, Icons.check_circle_outline),
                const SizedBox(width: 8),
                _statCard('Votes', '${controller.totalVotes}', Colors.orange, Icons.trending_up),
              ],
            ),
          )),
          // Filters
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _filterChip('all', 'All Polls'),
                const SizedBox(width: 8),
                _filterChip('open', 'Open'),
                const SizedBox(width: 8),
                _filterChip('closed', 'Closed'),
              ],
            ),
          ),
          Expanded(
            child: Obx(() {
              if (controller.isLoading.value) return const Center(child: CircularProgressIndicator());
              final filtered = _filteredPolls;
              if (filtered.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 72, height: 72,
                        decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                        child: Icon(Icons.how_to_vote, size: 36, color: AppTheme.textSubtle),
                      ),
                      SizedBox(height: 16),
                      Text('No polls available', style: TextStyle(color: AppTheme.textMuted, fontSize: 16)),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: () => controller.fetchPolls(),
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) => _buildPollCard(filtered[index]),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 16),
            SizedBox(height: 4),
            Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
            Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: 9)),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String value, String label) {
    final isActive = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primaryColor : AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: isActive ? AppTheme.primaryColor : AppTheme.borderColor),
        ),
        child: Text(label, style: TextStyle(color: isActive ? Colors.white : AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildPollCard(dynamic poll) {
    final isOpen = poll['isOpen'] == true || poll['status'] == 'open';
    final options = (poll['options'] as List?) ?? [];
    final totalVotes = options.fold(0, (sum, o) => sum + ((o['votes'] as num?)?.toInt() ?? 0));
    final meetingId = poll['meetingId'] ?? poll['meeting'];
    final authId = authCtrl.user['_id'];
    final hasVoted = (poll['voters'] as List?)?.contains(authId) ?? false;

    return Container(
      margin: EdgeInsets.only(bottom: 14),
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(poll['title'] ?? poll['question'] ?? 'Poll',
                  style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isOpen ? Colors.green.withOpacity(0.15) : Colors.red.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(isOpen ? 'OPEN' : 'CLOSED', style: TextStyle(color: isOpen ? Colors.green : Colors.red, fontSize: 9, fontWeight: FontWeight.bold)),
              ),
              if (_isAdmin) ...[
                SizedBox(width: 6),
                GestureDetector(
                  onTap: () => controller.togglePollStatus(poll['_id']),
                  child: Icon(isOpen ? Icons.check_circle : Icons.radio_button_unchecked, size: 16, color: isOpen ? Colors.green : AppTheme.textSubtle),
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: () async {
                    final confirmed = await Get.dialog<bool>(
                      AlertDialog(
                        backgroundColor: AppTheme.surfaceColor,
                        title: Text(
                          'Delete Poll',
                          style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
                        ),
                        content: Text(
                          'Delete this poll?',
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
                      await controller.deletePoll(poll['_id']);
                    }
                  },
                  child: Icon(Icons.delete_outline, color: Colors.red.shade300, size: 16),
                ),
              ],
            ],
          ),
          if (poll['description'] != null) ...[
            SizedBox(height: 6),
            Text(poll['description'], style: TextStyle(color: AppTheme.textSubtle, fontSize: 12)),
          ],
          if (meetingId != null && meetingId is String) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: Colors.indigo.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
              child: const Text('Meeting Poll', style: TextStyle(color: Colors.indigo, fontSize: 8, fontWeight: FontWeight.bold)),
            ),
          ] else ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
              child: const Text('Standalone Poll', style: TextStyle(color: AppTheme.primaryColor, fontSize: 8, fontWeight: FontWeight.bold)),
            ),
          ],
          const SizedBox(height: 12),
          ...options.map((option) {
            final votes = (option['votes'] as num?)?.toInt() ?? 0;
            final pct = totalVotes > 0 ? (votes / totalVotes * 100) : 0.0;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: GestureDetector(
                onTap: (isOpen && !hasVoted) ? () => controller.votePoll(poll['_id'], option['_id'] ?? option['id']) : null,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(option['text'] ?? option['label'] ?? '',
                            style: TextStyle(color: AppTheme.textPrimary, fontSize: 12))),
                        Text('${pct.toStringAsFixed(0)}% · $votes votes',
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: pct / 100,
                        backgroundColor: AppTheme.borderColor,
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor.withOpacity(0.7)),
                        minHeight: 5,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
          SizedBox(height: 6),
          Row(
            children: [
              Text('$totalVotes total votes', style: TextStyle(color: AppTheme.textSubtle, fontSize: 10)),
              if (hasVoted) ...[
                const SizedBox(width: 8),
                Icon(Icons.check, size: 12, color: AppTheme.primaryColor),
                Text('You voted', style: TextStyle(color: AppTheme.primaryColor, fontSize: 10)),
              ],
            ],
          ),
          if (poll['createdAt'] != null)
            Padding(
              padding: EdgeInsets.only(top: 4),
              child: Text('Created ${DateFormat('MMM d, yyyy').format(DateTime.parse(poll['createdAt']))}',
                  style: TextStyle(color: AppTheme.textSubtle, fontSize: 9)),
            ),
        ],
      ),
    );
  }

  void _showCreatePollDialog() {
    final titleCtrl = TextEditingController();
    final optionsCtrl = [TextEditingController(), TextEditingController()];
    String? errorMsg;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
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
                        'Create Poll',
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
                            style: const TextStyle(color: Color(0xFFEF4444), fontSize: 14, fontWeight: FontWeight.w500),
                          ),
                        ),
                      TextField(
                        controller: titleCtrl,
                        decoration: InputDecoration(
                          hintText: 'Poll question',
                          filled: true,
                          fillColor: const Color(0xFFF1F5F9),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...optionsCtrl.asMap().entries.map((e) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: e.value,
                                decoration: InputDecoration(
                                  hintText: 'Option ${e.key + 1}',
                                  filled: true,
                                  fillColor: const Color(0xFFF1F5F9),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                ),
                              ),
                            ),
                            if (optionsCtrl.length > 2) ...[
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: Color(0xFFEF4444), size: 24),
                                onPressed: () {
                                  setDialogState(() {
                                    e.value.dispose();
                                    optionsCtrl.removeAt(e.key);
                                  });
                                },
                              ),
                            ],
                          ],
                        ),
                      )),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: () => setDialogState(() => optionsCtrl.add(TextEditingController())),
                          icon: const Icon(Icons.add, size: 20, color: AppTheme.primaryColor),
                          label: const Text('Add Option', style: TextStyle(color: AppTheme.primaryColor, fontSize: 14, fontWeight: FontWeight.w600)),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => Navigator.pop(context),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                side: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              child: const Text('Cancel', style: TextStyle(color: Color(0xFF334155), fontSize: 16, fontWeight: FontWeight.w600)),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () async {
                                final opts = optionsCtrl.map((c) => c.text.trim()).where((t) => t.isNotEmpty).toList();
                                if (titleCtrl.text.isEmpty || opts.length < 2) {
                                  setDialogState(() => errorMsg = 'Title and at least 2 options required');
                                  return;
                                }
                                setDialogState(() => errorMsg = null);
                                final success = await controller.createPoll({
                                  'question': titleCtrl.text.trim(),
                                  'options': opts.map((t) => {'text': t}).toList(),
                                });
                                if (success && context.mounted) {
                                  Navigator.pop(context);
                                  Future.microtask(() {
                                    AppNotification.success(
                                      'Poll Created',
                                      'Poll created successfully',
                                    );
                                  });
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                elevation: 0,
                              ),
                              child: const Text('Create', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
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

  InputDecoration _inputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppTheme.textSubtle),
      filled: true, fillColor: AppTheme.backgroundColor,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
    );
  }
}