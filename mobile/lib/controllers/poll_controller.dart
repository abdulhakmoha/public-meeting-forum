import 'dart:convert';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/api_constants.dart';
import '../utils/app_notification.dart';

class PollController extends GetxController {
  var isLoading = false.obs;
  var polls = <dynamic>[].obs;
  var isSubmitting = false.obs;
  var hasVoted = <String, bool>{}.obs;

  int get totalPolls => polls.length;
  int get openCount => polls.where((p) => p['isOpen'] == true || p['status'] == 'open').length;
  int get totalVotes => polls.fold(0, (sum, p) {
    final options = (p['options'] as List?) ?? [];
    return sum + options.fold(0, (s, o) => s + ((o['votes'] as num?)?.toInt() ?? 0));
  });

  Future<void> fetchPolls() async {
    try {
      isLoading.value = true;
      final response = await ApiService.get(ApiConstants.polls);
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        polls.value = data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching polls: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<bool> votePoll(String pollId, String optionId) async {
    try {
      isSubmitting.value = true;
      final response = await ApiService.put('${ApiConstants.polls}/$pollId/vote', {
        'optionId': optionId,
      });
      if (response.statusCode == 200) {
        hasVoted[pollId] = true;
        await fetchPolls();
        AppNotification.success('Voted', 'Your vote has been recorded');
        return true;
      }
      AppNotification.error('Failed to submit vote');
      return false;
    } catch (e) {
      print('Error voting: $e');
      AppNotification.error('Could not connect to server');
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  Future<bool> createPoll(Map<String, dynamic> data) async {
    try {
      isSubmitting.value = true;
      final response = await ApiService.post(ApiConstants.polls, data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchPolls();
        return true;
      }
      final body = jsonDecode(response.body);
      AppNotification.error(body['message'] ?? 'Failed to create poll');
      return false;
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  Future<bool> togglePollStatus(String pollId) async {
    try {
      final response = await ApiService.put('${ApiConstants.polls}/$pollId/status', {});
      if (response.statusCode == 200) {
        await fetchPolls();
        AppNotification.success('Updated', 'Poll status updated');
        return true;
      }
      AppNotification.error('Failed to update poll');
      return false;
    } catch (e) {
      AppNotification.error('Could not update poll');
      return false;
    }
  }

  Future<bool> deletePoll(String pollId) async {
    try {
      final response = await ApiService.delete('${ApiConstants.polls}/$pollId');
      if (response.statusCode == 200) {
        polls.removeWhere((p) => p['_id'] == pollId);
        AppNotification.success('Deleted', 'Poll deleted');
        return true;
      }
      AppNotification.error('Failed to delete poll');
      return false;
    } catch (e) {
      AppNotification.error('Could not delete poll');
      return false;
    }
  }
}
