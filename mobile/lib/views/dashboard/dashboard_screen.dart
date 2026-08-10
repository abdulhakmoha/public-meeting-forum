import 'dart:convert';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/dashboard_controller.dart';
import '../../utils/app_notification.dart';
import '../../utils/theme.dart';

class DashboardScreen extends StatelessWidget {
  DashboardScreen({super.key});

  final DashboardController controller = Get.put(DashboardController());
  final AuthController authCtrl = Get.find<AuthController>();

  static const _chartColors = [
    Color(0xFF10B981),
    Color(0xFF6366F1),
    Color(0xFFF59E0B),
    Color(0xFF8B5CF6),
    Color(0xFFEF4444),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Obx(() {
          if (controller.isLoading.value) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
          }
          return RefreshIndicator(
            color: AppTheme.primaryColor,
            onRefresh: () => controller.fetchDashboardStats(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(context),
                  const SizedBox(height: 16),
                  _buildWelcome(),
                  const SizedBox(height: 20),
                  _buildStatsCards(),
                  const SizedBox(height: 20),
                  _buildMeetingGrowthCard(),
                  const SizedBox(height: 16),
                  _buildForumsByCategoryCard(),
                  const SizedBox(height: 16),
                  _buildUsersByDistrictCard(),
                  const SizedBox(height: 16),
                  _buildRecentActivity(),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Dashboard Overview',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Welcome back! Here's what's happening today.",
                    style: TextStyle(fontSize: 13, color: AppTheme.textSubtle),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF059669)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF10B981).withValues(alpha: 0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => _showReportDialog(context),
                  borderRadius: BorderRadius.circular(12),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Text(
                      'Generate Report',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildWelcome() {
    final name = authCtrl.user['name'] ?? 'User';
    return Text(
      'Welcome back, $name!',
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppTheme.textPrimary,
      ),
    );
  }

  Widget _buildStatsCards() {
    final isAdmin = authCtrl.user['role'] == 'admin';
    final allStats = [
      _StatData(
        'Total Users',
        controller.totalUsers.toString(),
        Icons.people_outline,
        const Color(0xFF10B981),
        const Color(0xFFCCFBF1),
        const Color(0xFFF0FDFA),
        const Color(0xFFCFFAFE),
      ),
      _StatData(
        'Active Meetings',
        controller.activeMeetings.toString(),
        Icons.calendar_today_outlined,
        const Color(0xFF6366F1),
        const Color(0xFFE0E7FF),
        const Color(0xFFEEF2FF),
        const Color(0xFFE0E7FF),
      ),
      _StatData(
        'Open Forums',
        controller.openForums.toString(),
        Icons.forum_outlined,
        const Color(0xFFF59E0B),
        const Color(0xFFFEF3C7),
        const Color(0xFFFFFBEB),
        const Color(0xFFFEF3C7),
      ),
      _StatData(
        'Total Comments',
        controller.totalComments.toString(),
        Icons.trending_up_rounded,
        const Color(0xFF10B981),
        const Color(0xFFDCFCE7),
        const Color(0xFFF0FDF4),
        const Color(0xFFDCFCE7),
      ),
    ];
    final stats = isAdmin ? allStats : allStats.where((s) => s.label != 'Total Users').toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 520 ? 4 : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: stats.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            mainAxisExtent: 132,
          ),
          itemBuilder: (_, i) => _statCard(stats[i]),
        );
      },
    );
  }

  Widget _statCard(_StatData s) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [s.gradientStart, s.gradientEnd],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: s.color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: s.bgColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(s.icon, color: s.color, size: 18),
          ),
          const Spacer(),
          Text(
            s.value,
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              height: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            s.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  void _showReportDialog(BuildContext context) {
    final isAdmin = authCtrl.user['role'] == 'admin';
    final now = DateFormat('EEEE, MMMM d, y').format(DateTime.now());
    final stamp = DateFormat('yyyyMMdd_HHmm').format(DateTime.now());

    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          backgroundColor: Colors.transparent,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.9),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.18),
                    blurRadius: 28,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(18, 18, 8, 18),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF10B981), Color(0xFF059669), Color(0xFF0D9488)],
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'PMCFMS System Report',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Generated on $now',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.85),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => _downloadReport(isAdmin: isAdmin, stamp: stamp),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.white,
                            backgroundColor: Colors.white.withValues(alpha: 0.18),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: BorderSide(color: Colors.white.withValues(alpha: 0.35)),
                            ),
                          ),
                          icon: const Icon(Icons.download_rounded, size: 16),
                          label: const Text('Download', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                  Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _reportSectionTitle('Summary Statistics'),
                          const SizedBox(height: 10),
                          GridView.count(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            crossAxisCount: 2,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                            mainAxisExtent: 88,
                            children: [
                              if (isAdmin)
                                _reportStatTile('TOTAL USERS', controller.totalUsers, const Color(0xFFF0FDFA), const Color(0xFF10B981)),
                              _reportStatTile('ACTIVE MEETINGS', controller.activeMeetings, const Color(0xFFEEF2FF), const Color(0xFF6366F1)),
                              _reportStatTile('OPEN FORUMS', controller.openForums, const Color(0xFFFFFBEB), const Color(0xFFF59E0B)),
                              _reportStatTile('TOTAL COMMENTS', controller.totalComments, const Color(0xFFF0FDF4), const Color(0xFF10B981)),
                            ],
                          ),
                          if (controller.monthlyMeetings.isNotEmpty) ...[
                            const SizedBox(height: 18),
                            _reportSectionTitle('Monthly Meeting Trend'),
                            const SizedBox(height: 10),
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                children: [
                                  for (var i = 0; i < controller.monthlyMeetings.length; i++) ...[
                                    if (i > 0) const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            'Month ${controller.monthlyMeetings[i]['_id']}',
                                            style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFECFDF5),
                                              borderRadius: BorderRadius.circular(20),
                                            ),
                                            child: Text(
                                              '${controller.monthlyMeetings[i]['count']}',
                                              style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF10B981)),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                          if (controller.recentActivity.isNotEmpty) ...[
                            const SizedBox(height: 18),
                            _reportSectionTitle('Recent Activity'),
                            const SizedBox(height: 10),
                            ...controller.recentActivity.take(8).map((a) {
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      margin: const EdgeInsets.only(right: 10),
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF10B981),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${a['action'] ?? ''}',
                                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF0F172A)),
                                          ),
                                          if ((a['details'] ?? '').toString().isNotEmpty)
                                            Text(
                                              '${a['details']}',
                                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${a['time'] ?? ''}',
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                          const SizedBox(height: 14),
                          const Divider(color: Color(0xFFE2E8F0)),
                          const SizedBox(height: 8),
                          const Center(
                            child: Text(
                              'PMCFMS — Confidential Report',
                              style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
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
      },
    );
  }

  Widget _reportSectionTitle(String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 6),
        Container(
          height: 3,
          width: 42,
          decoration: BoxDecoration(
            color: const Color(0xFF10B981),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ],
    );
  }

  Future<void> _downloadReport({required bool isAdmin, required String stamp}) async {
    final buf = StringBuffer()
      ..writeln('PMCFMS System Report')
      ..writeln('Generated: ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())}')
      ..writeln('')
      ..writeln('=== Summary Statistics ===');
    if (isAdmin) buf.writeln('Total Users: ${controller.totalUsers}');
    buf
      ..writeln('Active Meetings: ${controller.activeMeetings}')
      ..writeln('Open Forums: ${controller.openForums}')
      ..writeln('Total Comments: ${controller.totalComments}')
      ..writeln('');

    if (controller.monthlyMeetings.isNotEmpty) {
      buf.writeln('=== Monthly Meeting Trend ===');
      for (final m in controller.monthlyMeetings) {
        buf.writeln('Month ${m['_id']}: ${m['count']}');
      }
      buf.writeln('');
    }

    if (controller.recentActivity.isNotEmpty) {
      buf.writeln('=== Recent Activity ===');
      for (final a in controller.recentActivity.take(20)) {
        buf.writeln('- ${a['action'] ?? ''} | ${a['details'] ?? ''} | ${a['time'] ?? ''}');
      }
      buf.writeln('');
    }

    buf.writeln('PMCFMS — Confidential Report');

    try {
      const channel = MethodChannel('com.pmcfms.mobile/downloads');
      final saved = await channel.invokeMethod<String>('saveToDownloads', {
        'bytes': utf8.encode(buf.toString()),
        'filename': 'PMCFMS_Report_$stamp.txt',
        'mime': 'text/plain',
      });
      AppNotification.success(
        'Downloaded',
        saved != null && saved.isNotEmpty ? 'Saved to Downloads as $saved' : 'Saved to Downloads',
      );
    } catch (e) {
      AppNotification.error('Could not download report');
    }
  }

  Widget _reportStatTile(String label, int value, Color bg, Color accent) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accent.withValues(alpha: 0.25)),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.4, color: Color(0xFF475569))),
          const SizedBox(height: 6),
          Text(
            '$value',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
        ],
      ),
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: AppTheme.surfaceColor,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppTheme.borderColor),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }

  Widget _sectionTitle(IconData icon, Color iconColor, String title, {String? trailing}) {
    return Row(
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
        ),
        if (trailing != null)
          Text(
            trailing,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: AppTheme.textSubtle,
            ),
          ),
      ],
    );
  }

  // ── Meeting Growth (area chart) ──────────────────────────────────────────
  Widget _buildMeetingGrowthCard() {
    final data = controller.monthlyMeetings;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(
            Icons.trending_up_rounded,
            AppTheme.primaryColor,
            'Meeting Growth',
            trailing: 'SCHEDULED PER MONTH',
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: data.isEmpty
                ? Center(child: Text('No meeting data', style: TextStyle(color: AppTheme.textMuted)))
                : LineChart(_meetingGrowthData(data)),
          ),
        ],
      ),
    );
  }

  LineChartData _meetingGrowthData(List<Map<String, dynamic>> data) {
    final spots = <FlSpot>[];
    for (var i = 0; i < data.length; i++) {
      final count = (data[i]['count'] as num?)?.toDouble() ?? 0;
      spots.add(FlSpot(i.toDouble(), count));
    }
    final maxY = spots.isEmpty ? 10.0 : spots.map((s) => s.y).reduce((a, b) => a > b ? a : b);
    final yMax = (maxY * 1.2).clamp(4.0, double.infinity);

    return LineChartData(
      minY: 0,
      maxY: yMax,
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (_) => FlLine(
          color: AppTheme.primaryColor.withValues(alpha: 0.08),
          strokeWidth: 1,
          dashArray: [4, 4],
        ),
      ),
      borderData: FlBorderData(show: false),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 28,
            getTitlesWidget: (v, _) => Text(
              v.toInt().toString(),
              style: TextStyle(fontSize: 10, color: AppTheme.textSubtle),
            ),
          ),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            getTitlesWidget: (v, _) {
              final i = v.toInt();
              if (i < 0 || i >= data.length) return const SizedBox.shrink();
              return Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  '${data[i]['_id']}',
                  style: TextStyle(fontSize: 11, color: AppTheme.textSubtle),
                ),
              );
            },
          ),
        ),
      ),
      lineTouchData: LineTouchData(
        touchTooltipData: LineTouchTooltipData(
          getTooltipItems: (touched) => touched
              .map(
                (t) => LineTooltipItem(
                  '${t.y.toInt()}',
                  const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              )
              .toList(),
        ),
      ),
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: AppTheme.primaryColor,
          barWidth: 2.5,
          isStrokeCapRound: true,
          dotData: const FlDotData(show: true),
          belowBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                AppTheme.primaryColor.withValues(alpha: 0.25),
                AppTheme.primaryColor.withValues(alpha: 0.0),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ── Forums by Category (donut) ───────────────────────────────────────────
  Widget _buildForumsByCategoryCard() {
    final data = controller.forumsByCategory;
    final total = data.fold<int>(0, (s, e) => s + ((e['count'] as num?)?.toInt() ?? 0));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(Icons.pie_chart_outline_rounded, const Color(0xFFEF4444), 'Forums by Category'),
          const SizedBox(height: 8),
          SizedBox(
            height: 200,
            child: data.isEmpty || total == 0
                ? Center(child: Text('No forum data', style: TextStyle(color: AppTheme.textMuted)))
                : PieChart(
                    PieChartData(
                      sectionsSpace: 3,
                      centerSpaceRadius: 48,
                      sections: [
                        for (var i = 0; i < data.length; i++)
                          PieChartSectionData(
                            value: ((data[i]['count'] as num?)?.toDouble() ?? 0),
                            color: _chartColors[i % _chartColors.length],
                            radius: 36,
                            title: '',
                          ),
                      ],
                    ),
                  ),
          ),
          if (data.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 14,
              runSpacing: 8,
              children: [
                for (var i = 0; i < data.length; i++)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _chartColors[i % _chartColors.length],
                          shape: BoxShape.circle,
                        ),
                      ),
                      SizedBox(width: 6),
                      Text(
                        '${data[i]['_id'] ?? 'Other'}',
                        style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ── Users by District (bar) ──────────────────────────────────────────────
  Widget _buildUsersByDistrictCard() {
    final data = controller.usersByDistrict;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(Icons.location_on_outlined, AppTheme.primaryColor, 'Users by District'),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: data.isEmpty
                ? Center(child: Text('No district data', style: TextStyle(color: AppTheme.textMuted)))
                : BarChart(_usersByDistrictData(data)),
          ),
        ],
      ),
    );
  }

  BarChartData _usersByDistrictData(List<Map<String, dynamic>> data) {
    final maxCount = data
        .map((e) => (e['count'] as num?)?.toDouble() ?? 0)
        .fold<double>(0, (a, b) => a > b ? a : b);
    final yMax = (maxCount * 1.25).clamp(4.0, double.infinity);

    return BarChartData(
      maxY: yMax,
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (_) => FlLine(
          color: AppTheme.primaryColor.withValues(alpha: 0.07),
          strokeWidth: 1,
          dashArray: [4, 4],
        ),
      ),
      borderData: FlBorderData(show: false),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 28,
            getTitlesWidget: (v, _) => Text(
              v.toInt().toString(),
              style: TextStyle(fontSize: 10, color: AppTheme.textSubtle),
            ),
          ),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            getTitlesWidget: (v, _) {
              final i = v.toInt();
              if (i < 0 || i >= data.length) return const SizedBox.shrink();
              final label = '${data[i]['_id'] ?? ''}';
              return Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  label.length > 10 ? '${label.substring(0, 9)}…' : label,
                  style: TextStyle(fontSize: 10, color: AppTheme.textSubtle),
                ),
              );
            },
          ),
        ),
      ),
      barTouchData: BarTouchData(
        touchTooltipData: BarTouchTooltipData(
          getTooltipItem: (group, groupIndex, rod, rodIndex) {
            final name = '${data[group.x.toInt()]['_id'] ?? ''}';
            return BarTooltipItem(
              '$name\n${rod.toY.toInt()}',
              const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
            );
          },
        ),
      ),
      barGroups: [
        for (var i = 0; i < data.length; i++)
          BarChartGroupData(
            x: i,
            barRods: [
              BarChartRodData(
                toY: (data[i]['count'] as num?)?.toDouble() ?? 0,
                color: AppTheme.primaryColor,
                width: 22,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
              ),
            ],
          ),
      ],
    );
  }

  // ── Recent Activity (timeline like web) ──────────────────────────────────
  Widget _buildRecentActivity() {
    final activities = controller.recentActivity;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(Icons.access_time_rounded, const Color(0xFFF59E0B), 'Recent Activity'),
          const SizedBox(height: 16),
          if (activities.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text('No recent activity found.', style: TextStyle(color: AppTheme.textMuted)),
              ),
            )
          else
            ...List.generate(activities.length.clamp(0, 6), (i) {
              final act = activities[i];
              final isMeeting = act['type'] == 'meeting';
              final color = isMeeting ? AppTheme.primaryColor : const Color(0xFF8B5CF6);
              final isLast = i == activities.length.clamp(0, 6) - 1;

              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 24,
                      child: Column(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: color.withValues(alpha: 0.15),
                              border: Border.all(color: color.withValues(alpha: 0.4)),
                            ),
                            child: Center(
                              child: Container(
                                width: 7,
                                height: 7,
                                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                              ),
                            ),
                          ),
                          if (!isLast)
                            Expanded(
                              child: Container(
                                width: 1,
                                margin: EdgeInsets.symmetric(vertical: 4),
                                color: AppTheme.borderColor,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              act['action']?.toString() ?? '',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            if (act['details'] != null) ...[
                              SizedBox(height: 2),
                              Text(
                                act['details'].toString(),
                                style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                            if (act['time'] != null) ...[
                              SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.access_time, size: 11, color: AppTheme.textSubtle),
                                  SizedBox(width: 4),
                                  Text(
                                    act['time'].toString(),
                                    style: TextStyle(fontSize: 11, color: AppTheme.textSubtle),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _StatData {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final Color bgColor;
  final Color gradientStart;
  final Color gradientEnd;
  _StatData(
    this.label,
    this.value,
    this.icon,
    this.color,
    this.bgColor,
    this.gradientStart,
    this.gradientEnd,
  );
}