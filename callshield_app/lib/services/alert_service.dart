import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class AlertService {
  WebSocketChannel? _channel;
  final StreamController<Map<String, dynamic>> _alertController = StreamController.broadcast();
  Stream<Map<String, dynamic>> get alertStream => _alertController.stream;

  bool isMonitoring = true; // User's intentional toggle state
  final ValueNotifier<bool> isConnected = ValueNotifier<bool>(false); // Actual network state

  String? _currentUrl;
  Timer? _reconnectTimer;

  void connect(String url) {
    _currentUrl = url;
    _initConnection();
  }

  void _initConnection() {
    if (_currentUrl == null) return;

    try {
      // Ensure we are using wss:// or ws://
      final wsUrlString = _currentUrl!.startsWith('http')
          ? _currentUrl!.replaceFirst('http', 'ws')
          : _currentUrl!;

      final wsUrl = Uri.parse(wsUrlString);

      _channel = WebSocketChannel.connect(wsUrl);

      // If we connect successfully, update state
      isConnected.value = true;
      print("✅ [AlertService] Connected to backend");

      _channel!.stream.listen(
            (message) {
          try {
            final data = json.decode(message);
            _alertController.add(data);
          } catch (e) {
            print("Error parsing message: $e");
          }
        },
        onDone: () {
          print("❌ [AlertService] WebSocket Disconnected (Server offline)");
          _handleDisconnect();
        },
        onError: (error) {
          print("❌ [AlertService] WebSocket Error: $error");
          _handleDisconnect();
        },
        cancelOnError: true,
      );
    } catch (e) {
      print("[AlertService] Connection failed: $e");
      _handleDisconnect();
    }
  }

  void _handleDisconnect() {
    isConnected.value = false; // Instantly tells the UI the server is gone
    _channel?.sink.close();
    _channel = null;

    // Auto-Reconnect Loop: Try again every 3 seconds
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (!isConnected.value) {
        print("🔄 [AlertService] Attempting to auto-reconnect...");
        _initConnection();
      } else {
        timer.cancel(); // Stop looping if connected
      }
    });
  }

  void toggleMonitoring() {
    isMonitoring = !isMonitoring;
    // Only send the command if the server is actually listening
    if (_channel != null && isConnected.value) {
      final action = isMonitoring ? 'resume_monitoring' : 'pause_monitoring';
      _channel!.sink.add(jsonEncode({'action': action}));
      print("Sent to Backend: $action");
    }
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    isConnected.value = false;
  }
}