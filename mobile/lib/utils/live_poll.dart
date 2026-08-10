import 'dart:async';
import 'package:flutter/widgets.dart';

/// Quiet background refresh so other sessions see new data without manual reload.
class LivePoll {
  LivePoll._();

  static Timer? _timer;
  static final Set<VoidCallback> _callbacks = {};

  static void register(VoidCallback callback) {
    _callbacks.add(callback);
    _timer ??= Timer.periodic(const Duration(seconds: 8), (_) {
      for (final cb in List<VoidCallback>.from(_callbacks)) {
        try {
          cb();
        } catch (_) {}
      }
    });
  }

  static void unregister(VoidCallback callback) {
    _callbacks.remove(callback);
    if (_callbacks.isEmpty) {
      _timer?.cancel();
      _timer = null;
    }
  }
}
