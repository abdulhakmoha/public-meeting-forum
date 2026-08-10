import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/app_notification.dart';
import '../utils/live_poll.dart';

class IssueController extends GetxController {
  var isLoading = false.obs;
  var issues = <dynamic>[].obs;
  var isSubmitting = false.obs;

  late final VoidCallback _liveRefresh;

  @override
  void onInit() {
    super.onInit();
    _liveRefresh = () => fetchIssues(quiet: true);
    LivePoll.register(_liveRefresh);
  }

  @override
  void onClose() {
    LivePoll.unregister(_liveRefresh);
    super.onClose();
  }

  Future<void> fetchIssues({bool quiet = false}) async {
    try {
      if (!quiet) isLoading.value = true;
      final response = await ApiService.get('/issues');
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        issues.value = data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching issues: $e');
    } finally {
      if (!quiet) isLoading.value = false;
    }
  }

  Future<bool> createIssue(Map<String, dynamic> data) async {
    try {
      isSubmitting.value = true;
      final response = await ApiService.post('/issues', data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchIssues();
        return true;
      }
      AppNotification.error('Failed to submit issue');
      return false;
    } catch (e) {
      print('Error creating issue: $e');
      AppNotification.error('Could not connect to server');
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  Future<bool> updateIssueStatus(String id, String status, {String? adminNotes}) async {
    try {
      final body = <String, dynamic>{'status': status};
      if (adminNotes != null && adminNotes.isNotEmpty) {
        body['adminNotes'] = adminNotes;
      }
      final response = await ApiService.put('/issues/$id/status', body);
      if (response.statusCode == 200) {
        final updated = jsonDecode(response.body)['data'];
        final idx = issues.indexWhere((i) => i['_id'] == id);
        if (idx != -1) issues[idx] = updated;
        return true;
      }
      AppNotification.error('Failed to update issue');
      return false;
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<Map<String, dynamic>?> addComment(String issueId, String text) async {
    try {
      final response = await ApiService.post('/issues/$issueId/comments', {'text': text});
      if (response.statusCode == 200) {
        final updated = jsonDecode(response.body)['data'];
        final idx = issues.indexWhere((i) => i['_id'] == issueId);
        if (idx != -1) issues[idx] = updated;
        return updated;
      }
    } catch (e) {
      print('Error adding comment: $e');
    }
    return null;
  }

  Future<bool> deleteIssue(String id) async {
    try {
      final response = await ApiService.delete('/issues/$id');
      if (response.statusCode == 200) {
        issues.removeWhere((i) => i['_id'] == id);
        AppNotification.success('Deleted', 'Issue deleted');
        return true;
      }
      AppNotification.error('Failed to delete issue');
      return false;
    } catch (e) {
      print('Error deleting issue: $e');
      AppNotification.error('Could not connect to server');
      return false;
    }
  }
}
