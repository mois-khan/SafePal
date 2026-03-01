import 'dart:convert';
import 'dart:async';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'smart_alert_engine.dart';
import 'hardware_alert_service.dart';

class AlertService {
  WebSocketChannel? _channel;
  final StreamController<Map<String, dynamic>> _alertController = StreamController<Map<String, dynamic>>.broadcast();

  // Initialize our Brain and Muscle
  final SmartAlertEngine _smartEngine = SmartAlertEngine();
  final HardwareAlertService _hardwareService = HardwareAlertService();

  Stream<Map<String, dynamic>> get alertStream => _alertController.stream;

  AlertService() {
    // Setup Android Notifications when the service is created
    _hardwareService.initialize();
  }

  void connect(String ngrokUrl) {
    final wsUrl = ngrokUrl.replaceFirst('https://', 'wss://') + '/flutter-alerts';

    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      _channel!.stream.listen(
            (message) {
          final decodedMessage = jsonDecode(message);

          if (decodedMessage['type'] == 'SYSTEM') {
            _alertController.add(decodedMessage);
          }
          else if (decodedMessage['type'] == 'ALERT') {
            String threatLevel = decodedMessage['threatLevel'];
            int prob = decodedMessage['probability'] ?? 0;
            String reason = decodedMessage['explanation'] ?? 'Unknown tactics detected';

            // Push to the UI immediately (The screen always updates instantly)
            _alertController.add(decodedMessage);

            // Ask the Brain: Should we buzz the phone?
            if (_smartEngine.shouldTriggerHardwareAlert(threatLevel)) {
              // The Brain said YES. Flex the Muscle!
              _hardwareService.triggerSensoryAlert(threatLevel, prob, reason);
            }
          }
        },
      );
    } catch (e) {
      print('❌ Could not connect: $e');
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _alertController.close();
    _smartEngine.reset(); // Reset the cooldowns for the next phone call
  }
}