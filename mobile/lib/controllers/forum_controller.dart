import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/api_constants.dart';
import '../utils/app_notification.dart';
import '../utils/live_poll.dart';

class ForumController extends GetxController {
  var isLoading = true.obs;
  var forumsList = [].obs;
  var currentForum = {}.obs;
  var forumComments = [].obs;
  var isDetailLoading = true.obs;
  var isSubmitting = false.obs;

  late final VoidCallback _liveRefresh;

  @override
  void onInit() {
    super.onInit();
    fetchForums();
    _liveRefresh = () => fetchForums(quiet: true);
    LivePoll.register(_liveRefresh);
  }

  @override
  void onClose() {
    LivePoll.unregister(_liveRefresh);
    super.onClose();
  }

  Future<void> fetchForums({bool quiet = false}) async {
    try {
      if (!quiet) isLoading(true);
      final response = await ApiService.get(ApiConstants.forums);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        forumsList.value = data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching forums: $e');
    } finally {
      if (!quiet) isLoading(false);
    }
  }

  Future<void> fetchForumDetails(String id) async {
    try {
      isDetailLoading(true);
      final response = await ApiService.get('${ApiConstants.forums}/$id');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        currentForum.value = data['data'] ?? {};
        forumComments.value = data['comments'] ?? [];
      }
    } catch (e) {
      print('Error fetching forum details: $e');
    } finally {
      isDetailLoading(false);
    }
  }

  Future<bool> createForum(Map<String, dynamic> forumData) async {
    try {
      final response = await ApiService.post(ApiConstants.forums, forumData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchForums();
        // Success UI is shown by CreateForumScreen after Get.back()
        return true;
      } else {
        final data = jsonDecode(response.body);
        AppNotification.error(data['message'] ?? 'Failed to create');
        return false;
      }
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<bool> voteForum(String id, String type) async {
    try {
      final response = await ApiService.put('${ApiConstants.forums}/$id/$type', {});
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        currentForum.value = data['data'] ?? {};
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> postComment(String forumId, String text) async {
    try {
      isSubmitting(true);
      final response = await ApiService.post('${ApiConstants.forums}/$forumId/comments', {'text': text});
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchForumDetails(forumId);
        AppNotification.success('Posted', 'Comment posted successfully');
        return true;
      } else {
        final data = jsonDecode(response.body);
        AppNotification.error(data['message'] ?? 'Failed to post');
        return false;
      }
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    } finally {
      isSubmitting(false);
    }
  }

  Future<bool> approveForum(String id) async {
    try {
      final response = await ApiService.put('${ApiConstants.forums}/$id/approve', {});
      if (response.statusCode == 200) {
        await fetchForums();
        AppNotification.success('Approved', 'Forum topic approved');
        return true;
      }
      return false;
    } catch (e) {
      AppNotification.error('Could not approve forum');
      return false;
    }
  }

  Future<bool> deleteForum(String id) async {
    try {
      final response = await ApiService.delete('${ApiConstants.forums}/$id');
      if (response.statusCode == 200) {
        await fetchForums();
        // Caller may Get.back() — show success after navigation
        Future.microtask(() {
          AppNotification.success('Deleted', 'Forum topic deleted');
        });
        return true;
      }
      AppNotification.error('Failed to delete forum');
      return false;
    } catch (e) {
      AppNotification.error('Could not delete forum');
      return false;
    }
  }
}
