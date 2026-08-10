import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../controllers/meeting_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/notification_controller.dart';
import '../../utils/theme.dart';
import 'virtual_meeting_screen.dart';

class MeetingDetailsScreen extends StatefulWidget {
  final String meetingId;
  const MeetingDetailsScreen({Key? key, required this.meetingId}) : super(key: key);
  @override
  State<MeetingDetailsScreen> createState() => _MeetingDetailsScreenState();
}

class _MeetingDetailsScreenState extends State<MeetingDetailsScreen> {
  final MeetingController controller = Get.put(MeetingController());
  final AuthController authCtrl = Get.find<AuthController>();
  final NotificationController notifCtrl = Get.find<NotificationController>();

  @override
  void initState() {
    super.initState();
    controller.fetchMeetingDetails(widget.meetingId);
    controller.fetchMeetingPolls(widget.meetingId);
  }

  bool get _canManage => authCtrl.user['role'] == 'admin' || authCtrl.user['role'] == 'moderator';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Obx(() {
        if (controller.isDetailLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        final meeting = controller.currentMeeting;
        if (meeting.isEmpty) {
          return Center(child: Text('Meeting not found', style: TextStyle(color: AppTheme.textPrimary)));
        }

        final date = meeting['date'] != null ? DateTime.tryParse(meeting['date']) : null;
        final isJoined = (meeting['attendees'] as List?)?.any(
          (a) => a is Map ? a['_id'] == authCtrl.user['_id'] : a == authCtrl.user['_id'],
        ) ?? false;
        DateTime? endDate;
        if (date != null) {
          final endTime = meeting['endTime'] as String?;
          if (endTime != null && endTime.contains(':')) {
            final parts = endTime.split(':');
            endDate = DateTime(date.year, date.month, date.day, int.parse(parts[0]), int.parse(parts[1]));
          } else {
            endDate = date;
          }
        }
        final isPast = endDate != null && endDate.isBefore(DateTime.now());
        final isEnded = isPast || meeting['status'] == 'completed' || meeting['status'] == 'cancelled';

        return CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 120,
              pinned: true,
              backgroundColor: AppTheme.surfaceColor,
              leading: IconButton(
                icon: Icon(Icons.arrow_back_ios, color: AppTheme.textPrimary),
                onPressed: () => Get.back(),
              ),
              flexibleSpace: FlexibleSpaceBar(
                title: Text(meeting['title'] ?? 'Meeting', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                background: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: [AppTheme.primaryColor.withOpacity(0.3), AppTheme.primaryColor.withOpacity(0.1)],
                    ),
                  ),
                ),
              ),
              actions: [
                if (_canManage && !isEnded)
                  PopupMenuButton<String>(
                    icon: Icon(Icons.more_vert, color: AppTheme.textPrimary),
                    onSelected: (v) {
                      if (v == 'edit') _showEditDialog(meeting);
                      if (v == 'notify') notifCtrl.notifyMeetingAttendees(widget.meetingId);
                    },
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'edit', child: ListTile(leading: Icon(Icons.edit, size: 18), title: Text('Edit Meeting'))),
                      const PopupMenuItem(value: 'notify', child: ListTile(leading: Icon(Icons.notifications, size: 18), title: Text('Notify All Citizens'))),
                    ],
                  ),
              ],
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStatusBadges(meeting),
                    const SizedBox(height: 16),
                    _buildInfoCards(meeting, date),
                    const SizedBox(height: 16),
                    _buildDescription(meeting),
                    const SizedBox(height: 16),
                    if (meeting['organizer'] != null) ...[
                      _buildOrganizerCard(meeting['organizer']),
                      const SizedBox(height: 16),
                    ],
                    _buildActionButtons(meeting, isJoined, isEnded),
                    const SizedBox(height: 24),
                    _buildAttendeesSection(meeting),
                    const SizedBox(height: 24),
                    _buildPollsSection(),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildStatusBadges(Map meeting) {
    return Wrap(
      spacing: 8,
      children: [
        _badge(meeting['status'] ?? 'upcoming', _getStatusColor(meeting['status'])),
        if (meeting['category'] != null) _badge(meeting['category'], AppTheme.primaryColor),
        if (meeting['meetingType'] != null) _badge(meeting['meetingType'] == 'zoom' ? 'Virtual' : 'Physical', Colors.indigo),
      ],
    );
  }

  Widget _badge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(text.toUpperCase(), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildInfoCards(Map meeting, DateTime? date) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        children: [
          _infoRow(Icons.calendar_today, 'Date', date != null ? DateFormat('MMM d, yyyy').format(date) : 'TBD'),
          Divider(height: 20, color: AppTheme.borderColor),
          _infoRow(Icons.access_time, 'Time',
              meeting['startTime'] != null && meeting['endTime'] != null
                  ? '${meeting['startTime']} — ${meeting['endTime']}'
                  : (date != null ? '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}' : 'TBD')),
          Divider(height: 20, color: AppTheme.borderColor),
          _infoRow(meeting['meetingType'] == 'zoom' ? Icons.video_call : Icons.location_on, 'Location', meeting['location'] ?? 'TBD'),
          Divider(height: 20, color: AppTheme.borderColor),
          _infoRow(Icons.people_outline, 'Attendees', '${(meeting['attendees'] as List?)?.length ?? 0} people'),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.primaryColor),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: AppTheme.textSubtle, fontSize: 11)),
            SizedBox(height: 2),
            Text(value, style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
          ],
        ),
      ],
    );
  }

  Widget _buildOrganizerCard(dynamic organizer) {
    final name = organizer is Map ? (organizer['name'] ?? 'Organizer') : 'Organizer';
    final role = organizer is Map ? (organizer['role'] ?? '') : '';
    final email = organizer is Map ? (organizer['email'] ?? '') : '';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
            child: Text(name.toString().substring(0, 1).toUpperCase(), style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 18)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
                SizedBox(height: 2),
                Text(email, style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                const SizedBox(height: 2),
                if (role.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                    child: Text(role, style: TextStyle(color: AppTheme.primaryColor, fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ),
          Icon(Icons.shield_outlined, color: AppTheme.primaryColor, size: 18),
        ],
      ),
    );
  }

  Widget _buildDescription(Map meeting) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Agenda', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text(meeting['description'] ?? 'No description provided',
              style: TextStyle(color: AppTheme.textSubtle, fontSize: 14, height: 1.6)),
        ],
      ),
    );
  }

  Widget _buildActionButtons(Map meeting, bool isJoined, bool isEnded) {
    final isCancelled = meeting['status'] == 'cancelled';

    if (isEnded && !isCancelled) {
      return Container(
        width: double.infinity,
        padding: EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.textSubtle.withOpacity(0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.textSubtle.withOpacity(0.3)),
        ),
        child: Text('This meeting has ended',
            textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textSubtle, fontWeight: FontWeight.bold)),
      );
    }

    return Column(
      children: [
        if (isCancelled)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.errorColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.errorColor.withOpacity(0.3)),
            ),
            child: const Text('This meeting has been cancelled',
                textAlign: TextAlign.center, style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.bold)),
          )
        else if (!isJoined)
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: () => controller.joinMeeting(widget.meetingId),
              icon: const Icon(Icons.how_to_reg, color: Colors.white),
              label: const Text('RSVP Now', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 4,
              ),
            ),
          )
        else
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.green.withOpacity(0.3)),
            ),
            child: const Text('You are attending',
                textAlign: TextAlign.center, style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
          ),
        if (!isCancelled && isJoined && (meeting['meetingType'] == 'zoom' || meeting['meetingType'] == 'virtual')) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: () => Get.to(() => const VirtualMeetingScreen()),
              icon: const Icon(Icons.videocam, color: Colors.white),
              label: const Text('Join Virtual Meeting', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 4,
              ),
            ),
          ),
        ],
        if (_canManage && !isCancelled && !isEnded) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () async {
                final confirmed = await Get.dialog<bool>(
                  AlertDialog(
                    title: const Text('Cancel Meeting'),
                    content: const Text('Are you sure? All attendees will be notified.'),
                    actions: [
                      TextButton(onPressed: () => Get.back(result: false), child: const Text('No')),
                      TextButton(
                          onPressed: () => Get.back(result: true),
                          child: const Text('Yes, Cancel', style: TextStyle(color: AppTheme.errorColor))),
                    ],
                  ),
                );
                if (confirmed == true) {
                  await controller.cancelMeeting(widget.meetingId);
                }
              },
              icon: const Icon(Icons.cancel_outlined, color: AppTheme.errorColor),
              label: const Text('Cancel Meeting', style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.errorColor),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAttendeesSection(Map meeting) {
    final attendees = (meeting['attendees'] as List?) ?? [];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.people, size: 18, color: AppTheme.primaryColor),
              SizedBox(width: 8),
              Text('Attendees (${attendees.length})',
                  style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          SizedBox(height: 12),
          if (attendees.isEmpty)
            Text('No attendees yet', style: TextStyle(color: AppTheme.textSubtle))
          else
            ...attendees.map((a) {
              final name = a is Map ? (a['name'] ?? 'Unknown') : 'Unknown';
              final district = a is Map ? (a['district'] ?? '') : '';
              return Container(
                margin: EdgeInsets.only(bottom: 8),
                padding: EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.backgroundColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
                      child: Text(name.toString().substring(0, 1).toUpperCase(),
                          style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                        if (district.isNotEmpty) Text(district, style: TextStyle(color: AppTheme.textSubtle, fontSize: 11)),
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildPollsSection() {
    return Obx(() {
      final polls = controller.meetingPolls;
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: _cardDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.how_to_vote, size: 18, color: AppTheme.primaryColor),
                SizedBox(width: 8),
                Text('Polls (${polls.length})', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                const Spacer(),
                if (_canManage)
                  GestureDetector(
                    onTap: () => _showCreatePollDialog(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text('Create Poll', style: TextStyle(color: AppTheme.primaryColor, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
              ],
            ),
            SizedBox(height: 12),
            if (polls.isEmpty)
              Text('No polls for this meeting', style: TextStyle(color: AppTheme.textSubtle))
            else
              ...polls.map((poll) {
                final hasVoted = (poll['voters'] as List?)?.contains(authCtrl.user['_id']) ?? false;
                final totalVotes = (poll['options'] as List).fold<int>(0, (sum, o) => sum + ((o['votes'] as int?) ?? 0));
                final isOpen = poll['status'] == 'open';
                return Container(
                  margin: EdgeInsets.only(bottom: 16),
                  padding: EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.backgroundColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8, height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isOpen ? Colors.green : AppTheme.textSubtle,
                            ),
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(poll['question'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                          if (_canManage) ...[
                            GestureDetector(
                              onTap: () => controller.togglePollStatus(poll['_id'], widget.meetingId),
                              child: Icon(isOpen ? Icons.check_circle : Icons.radio_button_unchecked, size: 16, color: isOpen ? Colors.green : AppTheme.textSubtle),
                            ),
                            const SizedBox(width: 6),
                            GestureDetector(
                              onTap: () => controller.deletePoll(poll['_id'], widget.meetingId),
                              child: Icon(Icons.delete_outline, size: 16, color: Colors.red.shade300),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...(poll['options'] as List).map((option) {
                        final pct = totalVotes > 0 ? ((option['votes'] ?? 0) / totalVotes * 100).round() : 0;
                        if (hasVoted || !isOpen) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(child: Text(option['text'] ?? '', style: TextStyle(color: AppTheme.textMuted, fontSize: 13))),
                                    Text('$pct%', style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 13)),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(100),
                                  child: LinearProgressIndicator(
                                    value: pct / 100,
                                    minHeight: 6,
                                    backgroundColor: AppTheme.borderColor,
                                    valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor.withOpacity(0.7)),
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text('${option['votes'] ?? 0} votes', style: TextStyle(color: AppTheme.textSubtle, fontSize: 10)),
                              ],
                            ),
                          );
                        } else {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: InkWell(
                              onTap: () async {
                                final success = await controller.votePoll(poll['_id'], option['_id']);
                                if (success) controller.fetchMeetingPolls(widget.meetingId);
                              },
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                width: double.infinity,
                                padding: EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  border: Border.all(color: AppTheme.borderColor),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(option['text'] ?? '', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                              ),
                            ),
                          );
                        }
                      }),
                      SizedBox(height: 4),
                      Row(
                        children: [
                          Text('$totalVotes total votes', style: TextStyle(color: AppTheme.textSubtle, fontSize: 11)),
                          if (hasVoted) ...[
                            const SizedBox(width: 8),
                            Icon(Icons.check, size: 12, color: AppTheme.primaryColor),
                            Text('You voted', style: TextStyle(color: AppTheme.primaryColor, fontSize: 10)),
                          ],
                        ],
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      );
    });
  }

  void _showCreatePollDialog() {
    final questionCtrl = TextEditingController();
    final optionCtrls = [TextEditingController(), TextEditingController()];

    Get.defaultDialog(
      title: 'Create Poll',
      titleStyle: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
      backgroundColor: AppTheme.surfaceColor,
      content: StatefulBuilder(
        builder: (context, setState) {
          return Container(
            width: Get.width * 0.85,
            padding: const EdgeInsets.all(16),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: questionCtrl,
                    decoration: InputDecoration(
                      labelText: 'Question',
                      labelStyle: TextStyle(color: AppTheme.textSubtle),
                      filled: true, fillColor: AppTheme.backgroundColor,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...optionCtrls.asMap().entries.map((e) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: e.value,
                              decoration: InputDecoration(
                                labelText: 'Option ${e.key + 1}',
                                labelStyle: TextStyle(color: AppTheme.textSubtle),
                                filled: true, fillColor: AppTheme.backgroundColor,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          if (optionCtrls.length > 2)
                            IconButton(
                              icon: Icon(Icons.remove_circle_outline, color: AppTheme.errorColor, size: 20),
                              onPressed: () {
                                setState(() {
                                  optionCtrls[e.key].dispose();
                                  optionCtrls.removeAt(e.key);
                                });
                              },
                            ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 4),
                  TextButton.icon(
                    onPressed: () => setState(() => optionCtrls.add(TextEditingController())),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add Option', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
      textConfirm: 'Create Poll',
      textCancel: 'Cancel',
      confirmTextColor: Colors.white,
      onConfirm: () async {
        if (questionCtrl.text.isEmpty || optionCtrls.length < 2) {
          Get.snackbar('Error', 'Question and at least 2 options required');
          return;
        }
        final options = optionCtrls.map((c) => {'text': c.text.trim()}).where((o) => o['text']!.isNotEmpty).toList();
        if (options.length < 2) {
          Get.snackbar('Error', 'At least 2 non-empty options required');
          return;
        }
        final success = await controller.createPoll({
          'question': questionCtrl.text.trim(),
          'options': options,
          'meetingId': widget.meetingId,
        });
        if (success) Get.back();
      },
    );
  }

  void _showEditDialog(Map meeting) {
    final titleCtrl = TextEditingController(text: meeting['title'] ?? '');
    final descCtrl = TextEditingController(text: meeting['description'] ?? '');
    String type = meeting['meetingType'] ?? 'physical';
    String category = meeting['category'] ?? 'General';
    String location = meeting['location'] ?? '';
    String dateStr = meeting['date'] ?? '';
    String startTime = meeting['startTime'] ?? '09:00';
    String endTime = meeting['endTime'] ?? '12:00';
    DateTime selectedDate = dateStr.isNotEmpty ? (DateTime.tryParse(dateStr) ?? DateTime.now()) : DateTime.now();
    TimeOfDay selectedStart = _parseTime(startTime);
    TimeOfDay selectedEnd = _parseTime(endTime);

    Get.defaultDialog(
      title: 'Edit Meeting',
      titleStyle: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
      backgroundColor: AppTheme.surfaceColor,
      content: StatefulBuilder(
        builder: (context, setState) {
          return Container(
            width: Get.width * 0.9,
            padding: const EdgeInsets.all(16),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(controller: titleCtrl, decoration: _inputDeco('Meeting Title')),
                  const SizedBox(height: 12),
                  TextField(controller: descCtrl, maxLines: 3, decoration: _inputDeco('Description')),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: type,
                    decoration: _dropDeco(),
                    items: const [DropdownMenuItem(value: 'physical', child: Text('Physical')), DropdownMenuItem(value: 'zoom', child: Text('Zoom'))],
                    onChanged: (v) => setState(() => type = v ?? 'physical'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: category,
                    decoration: _dropDeco(),
                    items: ['General', 'Banadir', 'Hargeisa', 'Garowe', 'Kismayo', 'Baidoa']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                    onChanged: (v) => setState(() => category = v ?? 'General'),
                  ),
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: () async {
                      final d = await showDatePicker(context: context, initialDate: selectedDate,
                          firstDate: DateTime.now().subtract(const Duration(days: 365)),
                          lastDate: DateTime.now().add(const Duration(days: 365)));
                      if (d != null) {
                        setState(() {
                          selectedDate = d;
                          dateStr = DateFormat('yyyy-MM-dd').format(d);
                        });
                      }
                    },
                    child: Container(
                      width: double.infinity, padding: EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppTheme.backgroundColor,
                          borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)),
                      child: Text('Date: ${DateFormat('MMM d, yyyy').format(selectedDate)}', style: TextStyle(color: AppTheme.textMuted)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final t = await showTimePicker(context: context, initialTime: selectedStart);
                            if (t != null) setState(() => selectedStart = t);
                          },
                          child: Container(
                            padding: EdgeInsets.all(16),
                            decoration: BoxDecoration(color: AppTheme.backgroundColor,
                                borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)),
                            child: Text('Start: ${selectedStart.format(context)}', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final t = await showTimePicker(context: context, initialTime: selectedEnd);
                            if (t != null) setState(() => selectedEnd = t);
                          },
                          child: Container(
                            padding: EdgeInsets.all(16),
                            decoration: BoxDecoration(color: AppTheme.backgroundColor,
                                borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)),
                            child: Text('End: ${selectedEnd.format(context)}', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (type != 'zoom') ...[
                    const SizedBox(height: 12),
                    TextField(controller: TextEditingController(text: location), decoration: _inputDeco('Location / Address')),
                  ],
                ],
              ),
            ),
          );
        },
      ),
      textConfirm: 'Save Changes',
      textCancel: 'Cancel',
      confirmTextColor: Colors.white,
      onConfirm: () async {
        final data = {
          'title': titleCtrl.text.trim(),
          'description': descCtrl.text.trim(),
          'meetingType': type,
          'category': category,
          'date': DateFormat('yyyy-MM-dd').format(selectedDate),
          'startTime': '${selectedStart.hour.toString().padLeft(2, '0')}:${selectedStart.minute.toString().padLeft(2, '0')}',
          'endTime': '${selectedEnd.hour.toString().padLeft(2, '0')}:${selectedEnd.minute.toString().padLeft(2, '0')}',
          if (type != 'zoom') 'location': location,
        };
        final success = await controller.editMeeting(widget.meetingId, data);
        if (success) Get.back();
      },
    );
  }

  TimeOfDay _parseTime(String time) {
    if (time.contains(':')) {
      final parts = time.split(':');
      return TimeOfDay(hour: int.tryParse(parts[0]) ?? 9, minute: int.tryParse(parts[1]) ?? 0);
    }
    return const TimeOfDay(hour: 9, minute: 0);
  }

  InputDecoration _inputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppTheme.textSubtle),
      filled: true, fillColor: AppTheme.backgroundColor,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    );
  }

  InputDecoration _dropDeco() {
    return InputDecoration(
      filled: true, fillColor: AppTheme.backgroundColor,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: AppTheme.surfaceColor,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppTheme.borderColor),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 10, offset: const Offset(0, 4))],
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'upcoming': return Colors.amber;
      case 'ongoing': return Colors.green;
      case 'cancelled': return AppTheme.errorColor;
      default: return AppTheme.textSubtle;
    }
  }
}