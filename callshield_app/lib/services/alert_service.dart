import 'dart:convert';
import 'dart:async';
import 'package:web_socket_channel/web_socket_channel.dart';

class AlertService {
  WebSocketChannel? _channel;

  // The "loudspeaker" that will broadcast the JSON payload to your UI
  final StreamController<Map<String, dynamic>> _alertController = StreamController<Map<String, dynamic>>.broadcast();

  // Your UI will listen to this stream
  Stream<Map<String, dynamic>> get alertStream => _alertController.stream;

  void connect(String ngrokUrl) {
    // 1. Convert https:// to wss:// for WebSockets
    final wsUrl = ngrokUrl.replaceFirst('https://', 'wss://') + '/flutter-alerts';
    print('📱 Connecting to CallShield-AI: $wsUrl');

    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      // 2. Listen for incoming JSON payloads from Node.js
      _channel!.stream.listen(
            (message) {
          final decodedMessage = jsonDecode(message);
          print('📥 Received from server: $decodedMessage');

          // Push the decoded JSON into the stream so the UI updates instantly
          _alertController.add(decodedMessage);
        },
        onDone: () => print('🔴 WebSocket Closed.'),
        onError: (error) => print('⚠️ WebSocket Error: $error'),
      );
    } catch (e) {
      print('❌ Could not connect: $e');
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _alertController.close();
  }
}