import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../controllers/auth_controller.dart';
import '../../utils/meeting_resume_store.dart';
import '../../utils/theme.dart';

/// In-app Jitsi via WebView (same server as website). Avoids native SDK crashes.
class VirtualMeetingScreen extends StatefulWidget {
  final String? meetingId;
  final String? meetingTitle;
  final String? roomName;
  final bool autoJoin;

  const VirtualMeetingScreen({
    Key? key,
    this.meetingId,
    this.meetingTitle,
    this.roomName,
    this.autoJoin = true,
  }) : super(key: key);

  @override
  State<VirtualMeetingScreen> createState() => _VirtualMeetingScreenState();
}

class _VirtualMeetingScreenState extends State<VirtualMeetingScreen> {
  final AuthController authCtrl = Get.find<AuthController>();
  WebViewController? _controller;
  bool _loading = true;
  String? _error;
  double _progress = 0;

  String get _room {
    final fromWidget = widget.roomName?.trim();
    if (fromWidget != null && fromWidget.isNotEmpty) return fromWidget;
    if (widget.meetingId != null && widget.meetingId!.isNotEmpty) {
      return 'PMCFMS-Meeting-${widget.meetingId}';
    }
    return 'PMCFMS-Meeting-${DateTime.now().millisecondsSinceEpoch}';
  }

  String get _displayName => authCtrl.user['name']?.toString().trim().isNotEmpty == true
      ? authCtrl.user['name'].toString().trim()
      : 'PMCFMS User';

  Uri _jitsiUri(String room) {
    final encodedRoom = Uri.encodeComponent(room);
    final encodedName = Uri.encodeComponent(_displayName);
    // Match website: belnet.be + stable room + skip prejoin
    return Uri.parse(
      'https://jitsi.belnet.be/$encodedRoom'
      '#config.prejoinPageEnabled=false'
      '&config.startWithAudioMuted=true'
      '&config.disableDeepLinking=true'
      '&config.enableWelcomePage=false'
      '&userInfo.displayName=$encodedName',
    );
  }

  Uri _browserUrl(String room) => _jitsiUri(room);

  @override
  void initState() {
    super.initState();
    if (widget.meetingId != null && widget.meetingId!.isNotEmpty) {
      MeetingResumeStore.save(widget.meetingId!, openVirtual: true);
    }
    if (widget.autoJoin) {
      _startMeeting();
    }
  }

  Future<void> _ensureAvPermissions() async {
    final cam = await Permission.camera.request();
    final mic = await Permission.microphone.request();
    if (Platform.isAndroid) {
      await Permission.bluetoothConnect.request();
    }
    if (!cam.isGranted || !mic.isGranted) {
      throw Exception('Camera and microphone permission are required for video meetings.');
    }
  }

  Future<void> _startMeeting() async {
    setState(() {
      _loading = true;
      _error = null;
      _progress = 0;
    });

    try {
      await _ensureAvPermissions();
      final room = _room;
      final url = _jitsiUri(room);

      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (p) {
              if (mounted) setState(() => _progress = p / 100);
            },
            onPageStarted: (_) {
              if (mounted) setState(() => _loading = true);
            },
            onPageFinished: (_) {
              if (mounted) setState(() => _loading = false);
            },
            onWebResourceError: (err) {
              if (mounted) {
                setState(() {
                  _error = err.description.isNotEmpty ? err.description : 'Could not load meeting room';
                  _loading = false;
                });
              }
            },
          ),
        );

      if (Platform.isAndroid && controller.platform is AndroidWebViewController) {
        final android = controller.platform as AndroidWebViewController;
        android.setMediaPlaybackRequiresUserGesture(false);
        android.setOnPlatformPermissionRequest((request) => request.grant());
      }

      await controller.loadRequest(url);

      if (!mounted) return;
      setState(() {
        _controller = controller;
        _loading = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _openInBrowser() async {
    final ok = await launchUrl(_browserUrl(_room), mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      Get.snackbar('Error', 'Could not open browser for the meeting');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.meetingTitle ?? 'Virtual Meeting'),
        backgroundColor: const Color(0xFF065F46),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'Open in browser',
            onPressed: _openInBrowser,
            icon: const Icon(Icons.open_in_browser),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_error != null) {
      return _messagePanel(
        icon: Icons.error_outline,
        title: 'Could not join meeting',
        message: _error!,
        primaryLabel: 'Try again',
        onPrimary: _startMeeting,
        secondaryLabel: 'Open in browser',
        onSecondary: _openInBrowser,
      );
    }

    if (_controller == null) {
      return _messagePanel(
        icon: Icons.videocam_outlined,
        title: widget.meetingTitle ?? 'Virtual Meeting',
        message: 'Room: $_room\n\nTap below to join with camera and microphone.',
        primaryLabel: 'Join meeting',
        onPrimary: _startMeeting,
        secondaryLabel: 'Open in browser',
        onSecondary: _openInBrowser,
      );
    }

    return Stack(
      children: [
        WebViewWidget(controller: _controller!),
        if (_loading)
          Container(
            color: Colors.black87,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(color: AppTheme.primaryColor),
                  const SizedBox(height: 16),
                  Text(
                    _progress > 0 ? 'Loading meeting… ${(_progress * 100).round()}%' : 'Connecting to meeting…',
                    style: const TextStyle(color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _messagePanel({
    required IconData icon,
    required String title,
    required String message,
    required String primaryLabel,
    required VoidCallback onPrimary,
    required String secondaryLabel,
    required VoidCallback onSecondary,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: AppTheme.primaryColor),
            const SizedBox(height: 16),
            Text(title, textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textMuted, height: 1.5)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(onPressed: onPrimary, child: Text(primaryLabel)),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton(onPressed: onSecondary, child: Text(secondaryLabel)),
            ),
          ],
        ),
      ),
    );
  }
}
