import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../controllers/meeting_controller.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/theme.dart';
import 'meeting_details_screen.dart';
import 'create_meeting_screen.dart';

class MeetingsScreen extends StatefulWidget {
  MeetingsScreen({super.key});
  @override
  State<MeetingsScreen> createState() => _MeetingsScreenState();
}

class _MeetingsScreenState extends State<MeetingsScreen> {
  final MeetingController controller = Get.put(MeetingController());
  final AuthController authCtrl = Get.find<AuthController>();
  final TextEditingController searchCtrl = TextEditingController();
  String _search = '';
  String _districtFilter = 'all';
  bool _showCalendar = false;

  bool get _canManage => authCtrl.user['role'] == 'admin' || authCtrl.user['role'] == 'moderator';

  bool _isPast(Map meeting) {
    final date = meeting['date'] != null ? DateTime.tryParse(meeting['date']) : null;
    if (date == null) return false;
    final endTime = meeting['endTime'] as String?;
    if (endTime != null && endTime.contains(':')) {
      final parts = endTime.split(':');
      final end = DateTime(date.year, date.month, date.day, int.parse(parts[0]), int.parse(parts[1]));
      return end.isBefore(DateTime.now());
    }
    return date.isBefore(DateTime.now());
  }

  List get _filtered {
    var items = controller.meetingsList.where((m) {
      if (_search.isNotEmpty) {
        if (!(m['title'] ?? '').toString().toLowerCase().contains(_search.toLowerCase())) return false;
      }
      if (_districtFilter != 'all') {
        if ((m['category'] ?? '').toString().toLowerCase() != _districtFilter.toLowerCase()) return false;
      }
      return true;
    }).toList();
    return items;
  }

  @override
  void dispose() {
    searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Public Meetings'),
        actions: [
          IconButton(
            icon: Icon(_showCalendar ? Icons.list : Icons.calendar_month_outlined, size: 20),
            onPressed: () => setState(() => _showCalendar = !_showCalendar),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search + Filter
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Column(
              children: [
                TextField(
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
                const SizedBox(height: 8),
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _filterChip('all', 'All Districts'),
                      const SizedBox(width: 6),
                      _filterChip('Banadir', 'Banadir'),
                      const SizedBox(width: 6),
                      _filterChip('Hargeisa', 'Hargeisa'),
                      const SizedBox(width: 6),
                      _filterChip('Garowe', 'Garowe'),
                      const SizedBox(width: 6),
                      _filterChip('Kismayo', 'Kismayo'),
                      const SizedBox(width: 6),
                      _filterChip('Baidoa', 'Baidoa'),
                    ],
                  ),
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
                        width: 64, height: 64,
                        decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(18)),
                        child: Icon(Icons.event_busy_outlined, size: 30, color: AppTheme.textSubtle),
                      ),
                      SizedBox(height: 14),
                      Text('No meetings found.', style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                      SizedBox(height: 4),
                      Text('Check back later.', style: TextStyle(color: AppTheme.textSubtle, fontSize: 12)),
                    ],
                  ),
                );
              }

              final upcoming = <Map>[];
              final past = <Map>[];
              for (var m in items) {
                if (_isPast(m) && m['status'] != 'ongoing') {
                  past.add(m);
                } else {
                  upcoming.add(m);
                }
              }

              if (_showCalendar) {
                return _buildCalendarView(items);
              }

              return RefreshIndicator(
                onRefresh: () => controller.fetchMeetings(),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                  children: [
                    if (upcoming.isNotEmpty) ...[
                      Padding(
                        padding: EdgeInsets.only(top: 12, bottom: 6),
                        child: Text('UPCOMING', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      ),
                      ...upcoming.map((m) => _buildMeetingCard(m, false)),
                    ],
                    if (past.isNotEmpty) ...[
                      Padding(
                        padding: EdgeInsets.only(top: 20, bottom: 6),
                        child: Text('PAST MEETINGS', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      ),
                      ...past.map((m) => _buildMeetingCard(m, true)),
                    ],
                  ],
                ),
              );
            }),
          ),
        ],
      ),
      floatingActionButton: _canManage
          ? FloatingActionButton(
              onPressed: () => Get.to(() => const CreateMeetingScreen()),
              backgroundColor: AppTheme.primaryColor,
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }

  Widget _filterChip(String value, String label) {
    final active = _districtFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _districtFilter = value),
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

  Widget _buildCalendarView(List items) {
    final now = DateTime.now();
    final thisMonth = items.where((m) {
      final d = m['date'] != null ? DateTime.tryParse(m['date']) : null;
      return d != null && d.month == now.month && d.year == now.year;
    }).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: Column(
            children: [
              Text('Meetings in ${DateFormat('MMMM yyyy').format(now)}',
                  style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
              SizedBox(height: 16),
              if (thisMonth.isEmpty)
                Text('No meetings this month', style: TextStyle(color: AppTheme.textSubtle))
              else
                ...thisMonth.map((m) {
                  final d = DateTime.parse(m['date']);
                  return Container(
                    margin: EdgeInsets.only(bottom: 8),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.backgroundColor,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: Text('${d.day}', style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                        ),
                        SizedBox(width: 12),
                        Expanded(child: Text(m['title'] ?? '', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13))),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMeetingCard(Map meeting, bool isPast) {
    final date = meeting['date'] != null ? DateTime.tryParse(meeting['date']) : null;
    final status = meeting['status'] ?? 'upcoming';
    final attendees = (meeting['attendees'] as List?)?.length ?? 0;
    final category = meeting['category'] ?? 'General';
    final location = meeting['location'] ?? 'N/A';

    return GestureDetector(
      onTap: () => Get.to(() => MeetingDetailsScreen(meetingId: meeting['_id'])),
      child: Opacity(
        opacity: isPast ? 0.55 : 1.0,
        child: Container(
          margin: EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 3,
                decoration: BoxDecoration(
                  color: isPast ? AppTheme.textSubtle : _statusBarColor(status),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(meeting['title'] ?? 'Untitled',
                              style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                        ),
                        const SizedBox(width: 8),
                        if (isPast)
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: AppTheme.textSubtle.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                            child: Text('ENDED', style: TextStyle(color: AppTheme.textSubtle, fontSize: 9, fontWeight: FontWeight.bold)),
                          )
                        else
                          _statusChip(status),
                        if (_canManage) ...[
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: () async {
                              final confirmed = await Get.dialog<bool>(
                                AlertDialog(
                                  title: const Text('Delete Meeting'),
                                  content: Text('Delete "${meeting['title']}"?'),
                                  actions: [
                                    TextButton(onPressed: () => Get.back(result: false), child: const Text('Cancel')),
                                    TextButton(onPressed: () => Get.back(result: true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
                                  ],
                                ),
                              );
                              if (confirmed == true) {
                                await controller.deleteMeeting(meeting['_id']);
                              }
                            },
                            child: Icon(Icons.delete_outline, color: Colors.red.shade300, size: 16),
                          ),
                        ],
                      ],
                    ),
                    if (meeting['description'] != null && (meeting['description'] as String).isNotEmpty) ...[
                      SizedBox(height: 6),
                      Text(meeting['description'],
                          style: TextStyle(color: AppTheme.textSubtle, fontSize: 12),
                          maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                    const SizedBox(height: 10),
                    Container(
                      padding: EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.backgroundColor.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Icon(Icons.calendar_today_outlined, size: 12, color: isPast ? AppTheme.textSubtle : AppTheme.primaryColor),
                              SizedBox(width: 5),
                              Text(date != null ? DateFormat('MMM d, yyyy').format(date) : 'TBD',
                                  style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                              SizedBox(width: 8),
                              Icon(Icons.access_time_outlined, size: 12, color: isPast ? AppTheme.textSubtle : AppTheme.primaryColor),
                              const SizedBox(width: 3),
                              Text(
                                meeting['startTime'] != null && meeting['endTime'] != null
                                    ? '${meeting['startTime']} — ${meeting['endTime']}'
                                    : '',
                                style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                            ],
                          ),
                          SizedBox(height: 5),
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined, size: 12, color: isPast ? AppTheme.textSubtle : AppTheme.primaryColor),
                              SizedBox(width: 5),
                              Expanded(child: Text(location, style: TextStyle(color: AppTheme.textMuted, fontSize: 10), overflow: TextOverflow.ellipsis)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 10),
                    Row(
                      children: [
                        Icon(Icons.people_outline, size: 12, color: isPast ? AppTheme.textSubtle : AppTheme.primaryColor),
                        SizedBox(width: 3),
                        Text('$attendees', style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                          child: Text(category.toString().capitalizeFirst!,
                              style: const TextStyle(color: AppTheme.primaryColor, fontSize: 9, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _statusBarColor(String status) {
    switch (status) {
      case 'upcoming': return Color(0xFF22C55E);
      case 'ongoing': return Color(0xFF3B82F6);
      case 'cancelled': return AppTheme.errorColor;
      default: return AppTheme.textSubtle;
    }
  }

  Widget _statusChip(String status) {
    Color color;
    switch (status) {
      case 'upcoming': color = Color(0xFF22C55E); break;
      case 'ongoing': color = Color(0xFF3B82F6); break;
      case 'cancelled': color = AppTheme.errorColor; break;
      default: color = AppTheme.textSubtle;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
      child: Text(status.toUpperCase(), style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
    );
  }
}