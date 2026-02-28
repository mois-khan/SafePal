import 'package:flutter/material.dart';
import 'services/alert_service.dart';

void main() {
  runApp(const CallShieldApp());
}

class CallShieldApp extends StatelessWidget {
  const CallShieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CallShield-AI',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      debugShowCheckedModeBanner: false,
      home: const AlertScreen(),
    );
  }
}

class AlertScreen extends StatefulWidget {
  const AlertScreen({super.key});

  @override
  State<AlertScreen> createState() => _AlertScreenState();
}

class _AlertScreenState extends State<AlertScreen> {
  final AlertService _alertService = AlertService();

  // ⚠️ IMPORTANT: Paste your CURRENT active Ngrok URL here!
  final String currentNgrokUrl = "https://concavely-inflationary-eddy.ngrok-free.dev";

  @override
  void initState() {
    super.initState();
    // Connect to the backend the second the app opens
    _alertService.connect(currentNgrokUrl);
  }

  @override
  void dispose() {
    // Clean up the connection if the user closes the app
    _alertService.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CallShield-AI Security', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.grey[200],
        elevation: 0,
      ),
      // The StreamBuilder listens to the WebSocket in the background
      body: StreamBuilder<Map<String, dynamic>>(
        stream: _alertService.alertStream,
        builder: (context, snapshot) {

          // 1. Waiting for data / No connection yet
          if (!snapshot.hasData) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 20),
                  Text('Connecting to Security Engine...', style: TextStyle(fontSize: 16)),
                ],
              ),
            );
          }

          final payload = snapshot.data!;

          // 2. Handshake Successful (Safe State)
          if (payload['type'] == 'SYSTEM') {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.shield, color: Colors.green, size: 80),
                  const SizedBox(height: 20),
                  Text(payload['message'] ?? 'Monitoring Active',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green)),
                  const SizedBox(height: 10),
                  const Text('Your call is protected.'),
                ],
              ),
            );
          }

          // 3. 🚨 RED FLAG WARNING STATE 🚨
          if (payload['type'] == 'ALERT') {
            // Check if it's CRITICAL or just SUSPICIOUS
            bool isCritical = payload['threatLevel'] == 'CRITICAL';
            Color warningColor = isCritical ? Colors.red.shade700 : Colors.orange.shade700;

            return Container(
              width: double.infinity,
              color: warningColor,
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 100),
                  const SizedBox(height: 20),
                  Text(
                    isCritical ? 'CRITICAL THREAT DETECTED' : 'SUSPICIOUS CALLER',
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(15),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                    child: Column(
                      children: [
                        Text('Scam Probability: ${payload['probability']}%',
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        const Divider(),
                        Text('Reason: ${payload['explanation']}',
                            style: const TextStyle(fontSize: 16), textAlign: TextAlign.center),
                        const SizedBox(height: 10),
                        Text('Tactics Used: ${(payload['tactics'] as List).join(', ')}',
                            style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic, color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }

          return const Center(child: Text("Unknown data received"));
        },
      ),
    );
  }
}