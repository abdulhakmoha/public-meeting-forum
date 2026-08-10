import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/app_notification.dart';
import '../utils/live_poll.dart';

class ProjectController extends GetxController {
  var isLoading = false.obs;
  var projects = <dynamic>[].obs;
  var isSubmitting = false.obs;

  late final VoidCallback _liveRefresh;

  @override
  void onInit() {
    super.onInit();
    _liveRefresh = () => fetchProjects(quiet: true);
    LivePoll.register(_liveRefresh);
  }

  @override
  void onClose() {
    LivePoll.unregister(_liveRefresh);
    super.onClose();
  }

  Future<void> fetchProjects({bool quiet = false}) async {
    try {
      if (!quiet) isLoading.value = true;
      final response = await ApiService.get('/projects');
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        projects.value = data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching projects: $e');
    } finally {
      if (!quiet) isLoading.value = false;
    }
  }

  Future<Map<String, dynamic>?> fetchProjectDetails(String id) async {
    try {
      final response = await ApiService.get('/projects/$id');
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return data['data'];
      }
    } catch (e) {
      print('Error fetching project details: $e');
    }
    return null;
  }

  Future<bool> createProject(Map<String, dynamic> data) async {
    try {
      isSubmitting.value = true;
      final response = await ApiService.post('/projects', data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchProjects();
        AppNotification.success('Created', 'Project created successfully');
        return true;
      }
      AppNotification.error('Failed to create project');
      return false;
    } catch (e) {
      print('Error creating project: $e');
      AppNotification.error('Could not connect to server');
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  Future<bool> deleteProject(String id) async {
    try {
      final response = await ApiService.delete('/projects/$id');
      if (response.statusCode == 200) {
        projects.removeWhere((p) => p['_id'] == id);
        AppNotification.success('Deleted', 'Project deleted');
        return true;
      }
      AppNotification.error('Failed to delete project');
      return false;
    } catch (e) {
      print('Error deleting project: $e');
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<bool> updateProject(String id, Map<String, dynamic> data) async {
    try {
      final response = await ApiService.put('/projects/$id', data);
      if (response.statusCode == 200) {
        final updated = jsonDecode(response.body)['data'];
        final idx = projects.indexWhere((p) => p['_id'] == id);
        if (idx != -1) projects[idx] = updated;
        AppNotification.success('Updated', 'Project updated successfully');
        return true;
      }
      AppNotification.error('Failed to update project');
      return false;
    } catch (e) {
      print('Error updating project: $e');
      AppNotification.error('Could not connect to server');
      return false;
    }
  }

  Future<Map<String, dynamic>?> addProgressFile(String projectId, String url, String status) async {
    try {
      final response = await ApiService.post('/projects/$projectId/photos', {
        'url': url,
        'status': status,
      });
      if (response.statusCode == 200) {
        final updated = jsonDecode(response.body)['data'];
        final idx = projects.indexWhere((p) => p['_id'] == projectId);
        if (idx != -1) projects[idx] = updated;
        return updated;
      }
    } catch (e) {
      print('Error adding progress file: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>?> addComment(String projectId, String text) async {
    try {
      final response = await ApiService.post('/projects/$projectId/comments', {'text': text});
      if (response.statusCode == 200) {
        final updated = jsonDecode(response.body)['data'];
        final idx = projects.indexWhere((p) => p['_id'] == projectId);
        if (idx != -1) projects[idx] = updated;
        return updated;
      }
    } catch (e) {
      print('Error adding comment: $e');
    }
    return null;
  }
}
