import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../utils/app_notification.dart';
import '../utils/live_poll.dart';

class DocumentController extends GetxController {
  var isLoading = false.obs;
  var documents = <dynamic>[].obs;
  var isUploading = false.obs;

  late final VoidCallback _liveRefresh;

  @override
  void onInit() {
    super.onInit();
    _liveRefresh = () => fetchDocuments(quiet: true);
    LivePoll.register(_liveRefresh);
  }

  @override
  void onClose() {
    LivePoll.unregister(_liveRefresh);
    super.onClose();
  }

  Future<void> fetchDocuments({bool quiet = false}) async {
    try {
      if (!quiet) isLoading.value = true;
      final response = await ApiService.get('/documents');
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        documents.value = data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching documents: $e');
    } finally {
      if (!quiet) isLoading.value = false;
    }
  }

  Future<bool> uploadDocument(Map<String, dynamic> data) async {
    try {
      isUploading.value = true;
      final response = await ApiService.post('/documents', data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchDocuments();
        return true;
      }
      AppNotification.error('Failed to upload document');
      return false;
    } catch (e) {
      print('Error uploading document: $e');
      AppNotification.error('Could not connect to server');
      return false;
    } finally {
      isUploading.value = false;
    }
  }

  Future<bool> deleteDocument(String id) async {
    try {
      final response = await ApiService.delete('/documents/$id');
      if (response.statusCode == 200) {
        await fetchDocuments();
        AppNotification.success('Deleted', 'Document deleted');
        return true;
      }
      AppNotification.error('Failed to delete document');
      return false;
    } catch (e) {
      AppNotification.error('Could not delete document');
      return false;
    }
  }
}
