import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../utils/theme.dart';
import '../announcements/announcements_screen.dart';
import '../documents/documents_screen.dart';
import '../projects/projects_screen.dart';
import '../issues/issues_screen.dart';

class HubScreen extends StatelessWidget {
  const HubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      _HubItem(
        title: 'Announcements',
        subtitle: 'Latest community news',
        icon: Icons.campaign_rounded,
        color: const Color(0xFF10B981),
        gradientStart: const Color(0xFFF0FDF4),
        gradientEnd: const Color(0xFFD1FAE5),
        screen: const AnnouncementsScreen(),
      ),
      _HubItem(
        title: 'Documents',
        subtitle: 'Policies & files',
        icon: Icons.folder_rounded,
        color: const Color(0xFF6366F1),
        gradientStart: const Color(0xFFEEF2FF),
        gradientEnd: const Color(0xFFE0E7FF),
        screen: const DocumentsScreen(),
      ),
      _HubItem(
        title: 'Projects',
        subtitle: 'Track development',
        icon: Icons.work_rounded,
        color: const Color(0xFFF59E0B),
        gradientStart: const Color(0xFFFFFBEB),
        gradientEnd: const Color(0xFFFEF3C7),
        screen: const ProjectsScreen(),
      ),
      _HubItem(
        title: 'Public Issues',
        subtitle: 'Report & follow up',
        icon: Icons.report_problem_rounded,
        color: const Color(0xFFEF4444),
        gradientStart: const Color(0xFFFFF1F2),
        gradientEnd: const Color(0xFFFFE4E6),
        screen: const IssuesScreen(),
      ),
    ];

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
        centerTitle: true,
        title: Text(
          'Community Hub',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Explore community services',
              style: TextStyle(
                fontSize: 13,
                color: AppTheme.textSubtle,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 14,
                mainAxisSpacing: 14,
                childAspectRatio: 0.92,
                children: items.map((item) => _buildCard(item)).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(_HubItem item) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Get.to(() => item.screen),
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [item.gradientStart, item.gradientEnd],
            ),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: item.color.withValues(alpha: 0.18)),
            boxShadow: [
              BoxShadow(
                color: item.color.withValues(alpha: 0.12),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Stack(
            children: [
              Positioned(
                right: -18,
                top: -18,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: item.color.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                left: -10,
                bottom: -20,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: item.color.withValues(alpha: 0.06),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: item.color.withValues(alpha: 0.18),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(item.icon, color: item.color, size: 24),
                    ),
                    const Spacer(),
                    Text(
                      item.title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.subtitle,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF64748B).withValues(alpha: 0.95),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Text(
                          'Open',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: item.color,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, size: 14, color: item.color),
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
}

class _HubItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final Color gradientStart;
  final Color gradientEnd;
  final Widget screen;

  _HubItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.gradientStart,
    required this.gradientEnd,
    required this.screen,
  });
}