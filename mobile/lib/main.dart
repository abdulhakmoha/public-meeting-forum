import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'utils/theme.dart';
import 'utils/api_config.dart';
import 'utils/project_draft_store.dart';
import 'utils/document_draft_store.dart';
import 'utils/forum_draft_store.dart';
import 'utils/issue_draft_store.dart';
import 'controllers/auth_controller.dart';
import 'controllers/language_controller.dart';
import 'controllers/settings_controller.dart';
import 'layouts/main_layout.dart';
import 'views/auth/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.instance.init();

  // Drop stale "resume create" flags left after cancelled picks / Refresh,
  // so the app does not auto-open Register New Project / upload dialogs.
  await _clearStalePickerResumes();

  final auth = Get.put(AuthController());
  Get.put(LanguageController());
  Get.put(SettingsController(), permanent: true);
  await auth.checkLoginStatus();

  runApp(const MyApp());
}

Future<void> _clearStalePickerResumes() async {
  try {
    final projectStaged = await ProjectDraftStore.peekStagedFiles();
    if (projectStaged.isEmpty) await ProjectDraftStore.clear();

    final docStaged = await DocumentDraftStore.peekStagedFiles();
    if (docStaged.isEmpty) await DocumentDraftStore.clear();

    final forumStaged = await ForumDraftStore.peekStagedFiles();
    if (forumStaged.isEmpty) {
      // Keep forum text draft; only drop resume flag
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('forum_create_resume_v1', false);
      await prefs.remove('forum_staged_files_v1');
    }

    final issueStaged = await IssueDraftStore.peekStagedFiles();
    if (issueStaged.isEmpty) await IssueDraftStore.clear();
  } catch (_) {}
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final langCtrl = Get.find<LanguageController>();
    langCtrl.loadLanguage();
    final settings = Get.find<SettingsController>();

    return Obx(() {
      final dark = settings.darkMode.value;
      return GetMaterialApp(
        title: 'PMCFMS',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        home: const _AuthGate(),
        debugShowCheckedModeBanner: false,
      );
    });
  }
}

/// Keeps user on MainLayout when token exists (e.g. after Android recreates the app during file pick).
class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();
    return Obx(() {
      if (!auth.isReady.value) {
        return const Scaffold(
          body: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
        );
      }
      if (auth.isAuthenticated.value) {
        return const MainLayout();
      }
      return const LoginScreen();
    });
  }
}
