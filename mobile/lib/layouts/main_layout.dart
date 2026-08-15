import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/theme.dart';
import '../utils/api_constants.dart';
import '../utils/forum_draft_store.dart';
import '../utils/document_draft_store.dart';
import '../utils/project_draft_store.dart';
import '../utils/issue_draft_store.dart';
import '../controllers/auth_controller.dart';
import '../controllers/notification_controller.dart';
import '../controllers/language_controller.dart';
import '../controllers/forum_controller.dart';
import '../controllers/settings_controller.dart';
import '../utils/meeting_resume_store.dart';
import '../views/dashboard/dashboard_screen.dart';
import '../views/meetings/meetings_screen.dart';
import '../views/meetings/meeting_details_screen.dart';
import '../views/meetings/virtual_meeting_screen.dart';
import '../views/forums/forums_screen.dart';
import '../views/forums/create_forum_screen.dart';
import '../views/polls/polls_screen.dart';
import '../views/hub/hub_screen.dart';
import '../views/documents/documents_screen.dart';
import '../views/projects/projects_screen.dart';
import '../views/issues/issues_screen.dart';
import '../views/settings/settings_screen.dart';
import '../views/auth/login_screen.dart';
import '../views/users/users_screen.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({Key? key}) : super(key: key);

  @override
  _MainLayoutState createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;
  final NotificationController notifCtrl = Get.put(NotificationController());
  final LanguageController langCtrl = Get.find<LanguageController>();
  final AuthController authCtrl = Get.find<AuthController>();

  bool get _isAdminOrMod =>
      authCtrl.user['role'] == 'admin' ||
      authCtrl.user['role'] == 'moderator' ||
      authCtrl.user['role'] == 'secretary';

  final List<Widget> _screens = [
    DashboardScreen(),
    MeetingsScreen(),
    ForumsScreen(),
    const PollsScreen(),
    const HubScreen(),
    const SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _resumeAfterFilePicker());
  }

  Future<void> _resumeAfterFilePicker() async {
    // Restore meeting details after Jitsi / browser returns (Activity recreate)
    final meetingResume = await MeetingResumeStore.consume();
    if (meetingResume.id != null && meetingResume.id!.isNotEmpty && mounted) {
      setState(() => _currentIndex = 1); // Meetings tab
      await Future.delayed(const Duration(milliseconds: 80));
      if (!mounted) return;
      await Get.to(() => MeetingDetailsScreen(meetingId: meetingResume.id!));
      if (meetingResume.openVirtual && mounted) {
        await Get.to(
          () => VirtualMeetingScreen(
            meetingId: meetingResume.id,
            roomName: 'PMCFMS-Meeting-${meetingResume.id}',
          ),
        );
      }
      return;
    }

    // Only reopen create/upload screens when a staged file actually exists.
    // A leftover resume flag alone used to open Register New Project on every Refresh.
    final projectStaged = await ProjectDraftStore.peekStagedFiles();
    final resumeProject = await ProjectDraftStore.consumeResume();
    if (resumeProject && projectStaged.isNotEmpty && mounted) {
      setState(() => _currentIndex = 4); // Hub tab
      await Future.delayed(const Duration(milliseconds: 50));
      if (!mounted) return;
      Get.to(() => const ProjectsScreen(openCreateOnStart: true));
      return;
    }
    if (resumeProject && projectStaged.isEmpty) {
      // Stale resume from cancelled/failed pick — clear so Refresh opens normally
      await ProjectDraftStore.clear();
    }

    final docStaged = await DocumentDraftStore.peekStagedFiles();
    final resumeDoc = await DocumentDraftStore.consumeResume();
    if (resumeDoc && docStaged.isNotEmpty && mounted) {
      setState(() => _currentIndex = 4); // Hub tab
      await Future.delayed(const Duration(milliseconds: 50));
      if (!mounted) return;
      Get.to(() => const DocumentsScreen(openUploadOnStart: true));
      return;
    }
    if (resumeDoc && docStaged.isEmpty) {
      await DocumentDraftStore.clear();
    }

    final forumStaged = await ForumDraftStore.peekStagedFiles();
    final resumeForum = await ForumDraftStore.consumeResume();
    if (resumeForum && forumStaged.isNotEmpty && mounted) {
      if (!Get.isRegistered<ForumController>()) {
        Get.put(ForumController());
      }
      setState(() => _currentIndex = 2); // Forums tab
      await Future.delayed(const Duration(milliseconds: 50));
      if (!mounted) return;
      Get.to(() => const CreateForumScreen(), arguments: 'resumed');
      return;
    }
    if (resumeForum && forumStaged.isEmpty) {
      // Keep text draft optional — only clear the resume path noise
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('forum_create_resume_v1', false);
    }

    final issueStaged = await IssueDraftStore.peekStagedFiles();
    final resumeIssue = await IssueDraftStore.consumeResume();
    if (resumeIssue && issueStaged.isNotEmpty && mounted) {
      setState(() => _currentIndex = 4); // Hub tab
      await Future.delayed(const Duration(milliseconds: 50));
      if (!mounted) return;
      Get.to(() => const IssuesScreen(openCreateOnStart: true));
      return;
    }
    if (resumeIssue && issueStaged.isEmpty) {
      await IssueDraftStore.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: _buildAppBar(),
      body: _screens[_currentIndex],
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    final titles = ['Dashboard', 'Meetings', 'Forums', 'Polls', 'Hub', 'Settings'];
    return AppBar(
      backgroundColor: AppTheme.surfaceColor,
      elevation: 0,
      centerTitle: true,
      title: Text(
        titles[_currentIndex],
        style: TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      leading: Builder(
        builder: (ctx) => IconButton(
          icon: Icon(Icons.menu, color: AppTheme.textPrimary),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        ),
      ),
      actions: [
        IconButton(
          icon: Icon(Icons.search, color: AppTheme.textPrimary, size: 22),
          onPressed: () => _showGlobalSearch(),
        ),
        Stack(
          children: [
            IconButton(
              icon: Icon(Icons.notifications_outlined, color: AppTheme.textPrimary, size: 22),
              onPressed: () {
                if (Get.isRegistered<SettingsController>() &&
                    !Get.find<SettingsController>().notificationsEnabled.value) {
                  Get.snackbar(
                    'Notifications Off',
                    'Enable notifications in Settings to view them.',
                    snackPosition: SnackPosition.BOTTOM,
                  );
                  return;
                }
                _showNotifications();
              },
            ),
            Obx(() {
              final enabled = !Get.isRegistered<SettingsController>() ||
                  Get.find<SettingsController>().notificationsEnabled.value;
              return enabled && notifCtrl.hasUnread.value
                  ? Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                      ),
                    )
                  : const SizedBox();
            }),          ],
        ),
        Obx(() => TextButton(
          onPressed: () => langCtrl.toggleLanguage(),
          child: Text(
            langCtrl.currentLang.value.toUpperCase(),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
        )),
      ],
    );
  }

  Widget _buildBottomNav() {
    final items = const [
      _NavItem(Icons.grid_view_rounded, Icons.grid_view_rounded, 'Home'),
      _NavItem(Icons.calendar_month_outlined, Icons.calendar_month, 'Meetings'),
      _NavItem(Icons.forum_outlined, Icons.forum_rounded, 'Forums'),
      _NavItem(Icons.how_to_vote_outlined, Icons.how_to_vote, 'Polls'),
      _NavItem(Icons.hub_outlined, Icons.hub_rounded, 'Hub'),
      _NavItem(Icons.settings_outlined, Icons.settings_rounded, 'Settings'),
    ];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, -6),
          ),
        ],
        border: Border(
          top: BorderSide(color: const Color(0xFF10B981).withValues(alpha: 0.12)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(6, 8, 6, 6),
          child: Row(
            children: List.generate(items.length, (i) {
              final item = items[i];
              final active = _currentIndex == i;
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => setState(() => _currentIndex = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeOutCubic,
                          width: active ? 42 : 36,
                          height: 32,
                          decoration: BoxDecoration(
                            gradient: active
                                ? const LinearGradient(
                                    colors: [Color(0xFF10B981), Color(0xFF059669)],
                                  )
                                : null,
                            color: active ? null : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: active
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.35),
                                      blurRadius: 10,
                                      offset: const Offset(0, 3),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Icon(
                            active ? item.activeIcon : item.icon,
                            size: 20,
                            color: active ? Colors.white : const Color(0xFF94A3B8),
                          ),
                        ),
                        const SizedBox(height: 4),
                        AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 200),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                            color: active ? const Color(0xFF059669) : const Color(0xFF94A3B8),
                            letterSpacing: active ? 0.1 : 0,
                          ),
                          child: Text(
                            item.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer() {
    final user = authCtrl.user;
    final name = user['name'] ?? 'User';
    final email = user['email'] ?? '';
    final role = (user['role'] ?? 'citizen').toString();
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';

    return Drawer(
      backgroundColor: AppTheme.surfaceColor,
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 20,
              bottom: 20,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [Color(0xFF065F46), Color(0xFF10B981)]),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  child: () {
                    final pic = user['profileImage'] ?? user['profilePicture'];
                    final picUrl = ApiConstants.mediaUrl(pic?.toString());
                    if (picUrl.isEmpty) {
                      return Text(initial, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold));
                    }
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(30),
                      child: Image.network(
                        picUrl,
                        width: 60, height: 60, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Text(
                          initial,
                          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  }(),
                ),
                const SizedBox(height: 12),
                Text(name, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(email, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(role, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _drawerItem(Icons.dashboard_outlined, 'Dashboard', 0),
                _drawerItem(Icons.event_outlined, 'Meetings', 1),
                _drawerItem(Icons.forum_outlined, 'Forums', 2),
                _drawerItem(Icons.how_to_vote_outlined, 'Polls', 3),
                _drawerItem(Icons.hub_outlined, 'Hub', 4),
                if (_isAdminOrMod)
                  ListTile(
                    leading: Icon(Icons.people_outline, color: AppTheme.textSubtle, size: 22),
                    title: Text('Users', style: TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
                    onTap: () {
                      Navigator.pop(context);
                      Get.to(() => const UsersScreen());
                    },
                  ),
                _drawerItem(Icons.settings_outlined, 'Settings', 5),
              ],
            ),
          ),
          Container(
            padding: EdgeInsets.all(20),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: AppTheme.borderColor)),
            ),
            child: InkWell(
              onTap: () async {
                await authCtrl.logout();
                Get.offAll(() => const LoginScreen());
              },
              child: Row(
                children: [
                  Icon(Icons.logout, color: Colors.red.shade400, size: 20),
                  const SizedBox(width: 12),
                  Text(
                    'Logout',
                    style: TextStyle(
                      color: Colors.red.shade400,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _drawerItem(IconData icon, String label, int tabIndex) {
    final isActive = _currentIndex == tabIndex;
    return Container(
      decoration: isActive
          ? const BoxDecoration(
              border: Border(left: BorderSide(color: AppTheme.primaryColor, width: 3)),
            )
          : null,
      child: ListTile(
        leading: Icon(icon, color: isActive ? AppTheme.primaryColor : AppTheme.textSubtle, size: 22),
        title: Text(
          label,
          style: TextStyle(
            color: isActive ? AppTheme.textPrimary : AppTheme.textMuted,
            fontSize: 14,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
        onTap: () {
          Navigator.pop(context);
          setState(() => _currentIndex = tabIndex);
        },
      ),
    );
  }

  void _showGlobalSearch() {
    Get.bottomSheet(
      Container(
        height: Get.height * 0.85,
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: EdgeInsets.only(top: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Search meetings, forums, users...',
                  hintStyle: TextStyle(color: AppTheme.textMuted),
                  prefixIcon: Icon(Icons.search, color: AppTheme.textMuted),
                  filled: true,
                  fillColor: AppTheme.backgroundColor,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  contentPadding: EdgeInsets.symmetric(vertical: 12),
                ),
                style: TextStyle(color: AppTheme.textPrimary),
              ),
            ),
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.search, size: 48, color: AppTheme.textMuted),
                    SizedBox(height: 12),
                    Text('Type to search across all sections',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showNotifications() {
    Get.bottomSheet(
      Container(
        height: Get.height * 0.75,
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: EdgeInsets.only(top: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppTheme.borderColor, borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.notifications_outlined, color: AppTheme.primaryColor, size: 20),
                  SizedBox(width: 8),
                  Text('Notifications',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => notifCtrl.markAllRead(),
                    child: const Text('Mark all read',
                        style: TextStyle(color: AppTheme.primaryColor, fontSize: 12)),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: AppTheme.borderColor),
            Expanded(
              child: Obx(() {
                if (notifCtrl.notifications.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_off_outlined, size: 48, color: AppTheme.textMuted),
                        SizedBox(height: 12),
                        Text('No notifications', style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  itemCount: notifCtrl.notifications.length,
                  itemBuilder: (_, i) {
                    final n = notifCtrl.notifications[i];
                    final isRead = n['read'] == true || n['isRead'] == true;
                    return Container(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: isRead ? Colors.transparent : AppTheme.primaryLight,
                        border: Border(
                          bottom: BorderSide(color: AppTheme.borderColor, width: 0.5),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 8, height: 8, margin: const EdgeInsets.only(top: 5),
                            decoration: BoxDecoration(
                              color: isRead ? Colors.transparent : AppTheme.primaryColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(n['title'] ?? '',
                                    style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                                if (n['message'] != null) ...[
                                  SizedBox(height: 4),
                                  Text(n['message'],
                                      style: TextStyle(color: AppTheme.textMuted, fontSize: 12), maxLines: 2),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem(this.icon, this.activeIcon, this.label);
}