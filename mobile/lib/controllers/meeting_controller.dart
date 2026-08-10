import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/api_constants.dart';
import '../utils/app_notification.dart';
import '../utils/live_poll.dart';

class MeetingController extends GetxController {
  var isLoading = true.obs;
  var meetingsList = [].obs;
  var currentMeeting = {}.obs;
  var meetingPolls = [].obs;
  var isDetailLoading = true.obs;

  late final VoidCallback _liveRefresh;

  @override
  void onInit() {
    super.onInit();
    fetchMeetings();
    _liveRefresh = () => fetchMeetings(quiet: true);
    LivePoll.register(_liveRefresh);
  }

  @override
  void onClose() {
    LivePoll.unregister(_liveRefresh);
    super.onClose();
  }

  Future<void> fetchMeetings({bool quiet = false}) async {
    try {
      if (!quiet) isLoading(true);
      final response = await ApiService.get(ApiConstants.meetings);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        meetingsList.value = data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching meetings: $e');
    } finally {
      if (!quiet) isLoading(false);
    }
  }

  Future<void> fetchMeetingDetails(String id) async {
    try {
      isDetailLoading(true);
      final response = await ApiService.get('${ApiConstants.meetings}/$id');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        currentMeeting.value = data['data'] ?? {};
      }
    } catch (e) {
      print('Error fetching meeting details: $e');
    } finally {
      isDetailLoading(false);
    }
  }

  Future<void> fetchMeetingPolls(String meetingId) async {
    try {
      final response = await ApiService.get('${ApiConstants.polls}/meeting/$meetingId');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        meetingPolls.value = data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching polls: $e');
    }
  }

  Future<bool> joinMeeting(String meetingId) async {
    try {
      final response = await ApiService.post('${ApiConstants.meetings}/$meetingId/join', {});
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchMeetingDetails(meetingId);
        AppNotification.success('Joined!', 'You have joined the meeting');
        return true;
      } else {
        final data = jsonDecode(response.body);
        AppNotification.error(data['message'] ?? 'Failed to join');
        return false;
      }
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<bool> createMeeting(Map<String, dynamic> meetingData) async {
    try {
      final response = await ApiService.post(ApiConstants.meetings, meetingData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchMeetings();
        return true;
      } else {
        final data = jsonDecode(response.body);
        AppNotification.error(data['message'] ?? 'Failed to create meeting');
        return false;
      }
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<bool> votePoll(String pollId, String optionId) async {
    try {
      final response = await ApiService.put('${ApiConstants.polls}/$pollId/vote', {'optionId': optionId});
      if (response.statusCode == 200) {
        return true;
      } else {
        final data = jsonDecode(response.body);
        AppNotification.error(data['message'] ?? 'Failed to vote');
        return false;
      }
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<void> deleteMeeting(String id) async {
    try {
      final response = await ApiService.delete('${ApiConstants.meetings}/$id');
      if (response.statusCode == 200) {
        await fetchMeetings();
        AppNotification.success('Deleted', 'Meeting deleted');
      }
    } catch (e) {
      AppNotification.error('Could not delete meeting');
    }
  }

  Future<bool> cancelMeeting(String meetingId) async {
    try {
      final response = await ApiService.put('${ApiConstants.meetings}/$meetingId', {'status': 'cancelled'});
      if (response.statusCode == 200) {
        await fetchMeetingDetails(meetingId);
        await fetchMeetings();
        AppNotification.success('Cancelled', 'Meeting cancelled');
        return true;
      }
      return false;
    } catch (e) {
      AppNotification.error('Could not cancel meeting');
      return false;
    }
  }

  Future<bool> editMeeting(String meetingId, Map<String, dynamic> data) async {
    try {
      final response = await ApiService.put('${ApiConstants.meetings}/$meetingId', data);
      if (response.statusCode == 200) {
        await fetchMeetingDetails(meetingId);
        await fetchMeetings();
        AppNotification.success('Updated', 'Meeting updated');
        return true;
      }
      final body = jsonDecode(response.body);
      AppNotification.error(body['message'] ?? 'Failed to update meeting');
      return false;
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<bool> createPoll(Map<String, dynamic> data) async {
    try {
      final response = await ApiService.post(ApiConstants.polls, data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        if (data['meetingId'] != null) {
          await fetchMeetingPolls(data['meetingId']);
        }
        AppNotification.success('Poll Created', 'Poll created successfully');
        return true;
      }
      final body = jsonDecode(response.body);
      AppNotification.error(body['message'] ?? 'Failed to create poll');
      return false;
    } catch (e) {
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<bool> deletePoll(String pollId, String meetingId) async {
    try {
      final response = await ApiService.delete('${ApiConstants.polls}/$pollId');
      if (response.statusCode == 200) {
        await fetchMeetingPolls(meetingId);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> togglePollStatus(String pollId, String meetingId) async {
    try {
      final response = await ApiService.put('${ApiConstants.polls}/$pollId/status', {});
      if (response.statusCode == 200) {
        await fetchMeetingPolls(meetingId);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
