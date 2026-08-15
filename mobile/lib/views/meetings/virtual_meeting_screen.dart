import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:jitsi_meet_wrapper/jitsi_meet_wrapper.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/meeting_resume_store.dart';
import '../../utils/theme.dart';

class VirtualMeetingScreen extends StatefulWidget {
  final String? meetingId;
  final String? meetingTitle;
  final String? roomName;

  const VirtualMeetingScreen({
    Key? key,
    this.meetingId,
    this.meetingTitle,
    this.roomName,
  }) : super(key: key);

  @override
  State<VirtualMeetingScreen> createState() => _VirtualMeetingScreenState();
}

class _VirtualMeetingScreenState extends State<VirtualMeetingScreen> {
  final AuthController authCtrl = Get.find<AuthController>();
  late TextEditingController _roomCtrl;
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  bool _joining = false;

  String get _defaultRoom {
    if (widget.roomName != null && widget.roomName!.trim().isNotEmpty) {
      return widget.roomName!.trim();
    }
    if (widget.meetingId != null && widget.meetingId!.isNotEmpty) {
      return 'PMCFMS-Meeting-${widget.meetingId}';
    }
    return 'PMCFMS-Meeting-${DateTime.now().millisecondsSinceEpoch}';
  }

  @override
  void initState() {
    super.initState();
    _roomCtrl = TextEditingController(text: _defaultRoom);
    // Persist so Android Activity recreate after Jitsi returns to meeting, not blank dashboard
    if (widget.meetingId != null && widget.meetingId!.isNotEmpty) {
      MeetingResumeStore.save(widget.meetingId!, openVirtual: true);
    }
  }

  @override
  void dispose() {
    _roomCtrl.dispose();
    super.dispose();
  }

  Uri _browserUrl(String room) {
    final clean = room.replaceAll(RegExp(r'^https?://[^/]+/'), '');
    return Uri.parse('https://jitsi.belnet.be/${Uri.encodeComponent(clean)}');
  }

  Future<void> _openInBrowser(String room) async {
    final url = _browserUrl(room);
    final ok = await launchUrl(url, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      Get.snackbar('Error', 'Could not open browser for the meeting link');
    }
  }

  Future<void> _joinMeeting({bool preferBrowser = false}) async {
    final room = _roomCtrl.text.trim();
    if (room.isEmpty) {
      Get.snackbar('Error', 'Room name is required');
      return;
    }

    if (widget.meetingId != null && widget.meetingId!.isNotEmpty) {
      await MeetingResumeStore.save(widget.meetingId!, openVirtual: true);
    }

    setState(() => _joining = true);
    final userName = authCtrl.user['name'] ?? 'User';
    final userEmail = authCtrl.user['email'] ?? '';

    try {
      if (preferBrowser) {
        await _openInBrowser(room);
        return;
      }

      final options = JitsiMeetingOptions(
        roomNameOrUrl: room,
        serverUrl: 'https://jitsi.belnet.be',
        subject: widget.meetingTitle ?? 'Virtual Meeting',
        isAudioMuted: !_audioEnabled,
        isVideoMuted: !_videoEnabled,
        userDisplayName: userName,
        userEmail: userEmail,
      );

      await JitsiMeetWrapper.joinMeeting(options: options);
    } catch (error) {
      debugPrint('Jitsi join error: $error');
      // Native SDK often crashes / recreates Activity — fall back to browser
      await _openInBrowser(room);
      if (mounted) {
        Get.snackbar(
          'Opened in browser',
          'In-app video failed; joining via browser instead.',
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    } finally {
      if (mounted) setState(() => _joining = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Virtual Meeting')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF065F46), Color(0xFF10B981)]),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.videocam, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Video Conference',
                          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Powered by Jitsi Meet',
                          style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12),
                        ),
                        if (widget.meetingTitle != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            widget.meetingTitle!,
                            style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 11),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('Room Name', style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _roomCtrl,
              readOnly: widget.meetingId != null,
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Meeting room',
                hintStyle: TextStyle(color: AppTheme.textSubtle),
                prefixIcon: Icon(Icons.meeting_room_outlined, color: AppTheme.textSubtle, size: 20),
                filled: true,
                fillColor: AppTheme.surfaceColor,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Column(
                children: [
                  _toggleRow('Enable Audio', Icons.mic_outlined, _audioEnabled, (v) => setState(() => _audioEnabled = v)),
                  Divider(height: 20, color: AppTheme.borderColor),
                  _toggleRow('Enable Video', Icons.videocam_outlined, _videoEnabled, (v) => setState(() => _videoEnabled = v)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                onPressed: _joining ? null : () => _joinMeeting(),
                icon: _joining
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.videocam, color: Colors.white),
                label: Text(
                  _joining ? 'Joining...' : 'Join Meeting',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 4,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: _joining ? null : () => _joinMeeting(preferBrowser: true),
                icon: const Icon(Icons.open_in_browser),
                label: const Text('Join in Browser (recommended)'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.primaryColor,
                  side: BorderSide(color: AppTheme.primaryColor.withOpacity(0.5)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                'Same room as the website: ${_roomCtrl.text}',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.textSubtle, fontSize: 11),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _toggleRow(String label, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return Row(
      children: [
        Icon(icon, size: 20, color: value ? AppTheme.primaryColor : AppTheme.textSubtle),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: TextStyle(color: AppTheme.textPrimary, fontSize: 13))),
        Switch(
          value: value,
          activeColor: AppTheme.primaryColor,
          onChanged: onChanged,
        ),
      ],
    );
  }
}
