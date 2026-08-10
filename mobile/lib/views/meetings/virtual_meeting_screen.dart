import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:jitsi_meet_wrapper/jitsi_meet_wrapper.dart';
import '../../controllers/auth_controller.dart';
import '../../utils/theme.dart';

class VirtualMeetingScreen extends StatefulWidget {
  final String? meetingId;
  final String? meetingTitle;
  const VirtualMeetingScreen({Key? key, this.meetingId, this.meetingTitle}) : super(key: key);

  @override
  State<VirtualMeetingScreen> createState() => _VirtualMeetingScreenState();
}

class _VirtualMeetingScreenState extends State<VirtualMeetingScreen> {
  final AuthController authCtrl = Get.find<AuthController>();
  late TextEditingController _roomCtrl;
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  String _meetingType = 'public';

  @override
  void initState() {
    super.initState();
    _roomCtrl = TextEditingController(
      text: widget.meetingId != null ? 'PMCFMS-Meeting-${widget.meetingId}' : 'PMCFMS-Meeting-${DateTime.now().millisecondsSinceEpoch}',
    );
  }

  @override
  void dispose() {
    _roomCtrl.dispose();
    super.dispose();
  }

  Future<void> _joinMeeting() async {
    final room = _roomCtrl.text.trim();
    if (room.isEmpty) {
      Get.snackbar('Error', 'Room name is required');
      return;
    }

    final userName = authCtrl.user['name'] ?? 'User';
    final userEmail = authCtrl.user['email'] ?? '';

    try {
      var options = JitsiMeetingOptions(
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
      debugPrint("error: $error");
      Get.snackbar('Error', 'Failed to join meeting');
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
            // Header
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
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(14)),
                    child: const Icon(Icons.videocam, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Video Conference', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('Powered by Jitsi Meet', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
                        if (widget.meetingTitle != null) ...[
                          const SizedBox(height: 4),
                          Text(widget.meetingTitle!, style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 11)),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 24),
            // Room Name
            Text('Room Name', style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
            SizedBox(height: 8),
            TextField(
              controller: _roomCtrl,
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'e.g. Barangay-Meeting-2026',
                hintStyle: TextStyle(color: AppTheme.textSubtle),
                prefixIcon: Icon(Icons.meeting_room_outlined, color: AppTheme.textSubtle, size: 20),
                filled: true, fillColor: AppTheme.surfaceColor,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
            SizedBox(height: 20),
            // Meeting Type
            Text('Meeting Type', style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                _typeChip('public', 'Public'),
                const SizedBox(width: 10),
                _typeChip('private', 'Private (Invite Only)'),
              ],
            ),
            const SizedBox(height: 24),
            // Settings
            Container(
              padding: EdgeInsets.all(16),
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
              width: double.infinity, height: 56,
              child: ElevatedButton.icon(
                onPressed: _joinMeeting,
                icon: const Icon(Icons.videocam, color: Colors.white),
                label: Text('Join Meeting', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 4,
                ),
              ),
            ),
            SizedBox(height: 8),
            Center(
              child: Text('Room ID: ${_roomCtrl.text.isNotEmpty ? _roomCtrl.text.substring(0, _roomCtrl.text.length > 20 ? 20 : _roomCtrl.text.length) : ''}...',
                  style: TextStyle(color: AppTheme.textSubtle, fontSize: 10)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _typeChip(String value, String label) {
    final active = _meetingType == value;
    return GestureDetector(
      onTap: () => setState(() => _meetingType = value),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppTheme.primaryColor.withOpacity(0.15) : AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? AppTheme.primaryColor : AppTheme.borderColor),
        ),
        child: Text(label, style: TextStyle(color: active ? AppTheme.primaryColor : AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _toggleRow(String label, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return Row(
      children: [
        Icon(icon, size: 20, color: value ? AppTheme.primaryColor : AppTheme.textSubtle),
        SizedBox(width: 10),
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