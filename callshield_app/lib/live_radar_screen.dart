import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_background_service/flutter_background_service.dart';

class LiveRadarScreen extends StatefulWidget {
  const LiveRadarScreen({super.key});

  @override
  State<LiveRadarScreen> createState() => _LiveRadarScreenState();
}

class _LiveRadarScreenState extends State<LiveRadarScreen> {
  // Terminal state
  final List<Map<String, dynamic>> _transcriptLog = [];
  final ScrollController _scrollController = ScrollController();

  // Threat state
  double _currentThreatLevel = 0.0;
  String _currentStatus = "Listening securely...";
  Color _threatColor = const Color(0xFF10B981); // Starts Green

  @override
  void initState() {
    super.initState();

    // 🎧 1. LISTEN FOR LIVE TRANSCRIPTS
    FlutterBackgroundService().on('onTranscript').listen((event) {
      if (event != null && mounted) {
        setState(() {
          _transcriptLog.add({
            'role': event['role'], // 'inbound' or 'outbound'
            'text': event['text'],
          });
        });
        _scrollToBottom();
      }
    });

    // 🚨 2. LISTEN FOR THREAT SPIKES (From Gemini)
    FlutterBackgroundService().on('onThreatDetected').listen((event) {
      if (event != null && mounted) {
        setState(() {
          int prob = event['probability'] ?? 0;
          _currentThreatLevel = prob / 100.0;

          if (prob < 40) {
            _threatColor = const Color(0xFF10B981); // Green
            _currentStatus = "Conversation Safe";
          } else if (prob < 80) {
            _threatColor = Colors.orangeAccent; // Orange
            _currentStatus = "Suspicious Patterns Detected";
          } else {
            _threatColor = const Color(0xFFEF4444); // Red
            _currentStatus = "CRITICAL THREAT: ${event['tactics']?.first ?? 'Scam'}";
          }
        });
      }
    });
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Live Threat Radar", style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            // ==========================================
            // 1. THE THREAT GAUGE (Visually striking for judges)
            // ==========================================
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: _threatColor.withOpacity(0.5), width: 2),
                boxShadow: [
                  BoxShadow(color: _threatColor.withOpacity(0.2), blurRadius: 30, spreadRadius: 5),
                ],
              ),
              child: Column(
                children: [
                  Text("AI SCAM PROBABILITY", style: GoogleFonts.plusJakartaSans(color: Colors.grey[400], fontSize: 12, letterSpacing: 2, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        "${(_currentThreatLevel * 100).toInt()}",
                        style: GoogleFonts.plusJakartaSans(color: _threatColor, fontSize: 64, fontWeight: FontWeight.bold),
                      ),
                      Text("%", style: GoogleFonts.plusJakartaSans(color: _threatColor, fontSize: 32, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: LinearProgressIndicator(
                      value: _currentThreatLevel,
                      minHeight: 12,
                      backgroundColor: Colors.black26,
                      valueColor: AlwaysStoppedAnimation<Color>(_threatColor),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(_currentStatus, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
                ],
              ),
            ),
            const SizedBox(height: 30),

            // ==========================================
            // 2. THE TERMINAL (Live Intercept Log)
            // ==========================================
            Align(
              alignment: Alignment.centerLeft,
              child: Text("LIVE INTERCEPT LOG", style: GoogleFonts.plusJakartaSans(color: Colors.grey[400], fontSize: 12, letterSpacing: 2, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                ),
                child: _transcriptLog.isEmpty
                    ? Center(
                  child: Text("Waiting for audio stream...", style: GoogleFonts.jetBrainsMono(color: Colors.grey[600], fontSize: 13)),
                )
                    : ListView.builder(
                  controller: _scrollController,
                  physics: const BouncingScrollPhysics(),
                  itemCount: _transcriptLog.length,
                  itemBuilder: (context, index) {
                    final log = _transcriptLog[index];
                    final isInbound = log['role'] == 'inbound'; // Scammer

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isInbound ? "[TARGET] " : "[USER] ",
                            style: GoogleFonts.jetBrainsMono(
                              color: isInbound ? const Color(0xFFEF4444) : const Color(0xFF3B82F6),
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              log['text'],
                              style: GoogleFonts.jetBrainsMono(
                                color: Colors.grey[300],
                                fontSize: 13,
                                height: 1.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}