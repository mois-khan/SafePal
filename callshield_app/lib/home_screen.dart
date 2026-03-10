import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HomeScreen extends StatefulWidget {
  final bool isMonitoring;
  final VoidCallback onToggle;

  const HomeScreen({
    super.key,
    required this.isMonitoring,
    required this.onToggle,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    // This makes the shield "breathe"
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Midnight Slate
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. THE HEADER
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Good Morning,",
                          style: GoogleFonts.plusJakartaSans(color: Colors.grey[400], fontSize: 16),
                        ),
                        Text(
                          "You are secure.",
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    CircleAvatar(
                      backgroundColor: const Color(0xFF1E293B),
                      child: Icon(Icons.person_outline, color: Colors.grey[300]),
                    )
                  ],
                ),
                const SizedBox(height: 50),

                // 2. THE HERO SHIELD (Pulsing Radar)
                Center(
                  child: AnimatedBuilder(
                    animation: _pulseAnimation,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: widget.isMonitoring ? _pulseAnimation.value : 1.0,
                        child: Container(
                          width: 180,
                          height: 180,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: widget.isMonitoring
                                ? const Color(0xFF6366F1).withOpacity(0.15)
                                : Colors.grey.withOpacity(0.05),
                            boxShadow: widget.isMonitoring ? [
                              BoxShadow(
                                color: const Color(0xFF6366F1).withOpacity(0.3),
                                blurRadius: 40,
                                spreadRadius: 10,
                              )
                            ] : [],
                          ),
                          child: Center(
                            child: Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: widget.isMonitoring
                                    ? const Color(0xFF6366F1)
                                    : const Color(0xFF1E293B),
                              ),
                              child: Icon(
                                widget.isMonitoring ? Icons.security : Icons.shield_outlined,
                                size: 50,
                                color: widget.isMonitoring ? Colors.white : Colors.grey,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 30),
                Center(
                  child: Text(
                    widget.isMonitoring ? "Monitoring Active" : "System Paused",
                    style: GoogleFonts.plusJakartaSans(
                      color: widget.isMonitoring ? const Color(0xFF6366F1) : Colors.grey,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
                const SizedBox(height: 50),

                // 3. THE COMMAND CENTER (Midnight Glassmorphism)
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.03),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "AI Call Scanner",
                                style: GoogleFonts.plusJakartaSans(
                                    color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.isMonitoring ? "Analyzing in real-time" : "Sleeping",
                                style: GoogleFonts.plusJakartaSans(color: Colors.grey[400], fontSize: 14),
                              ),
                            ],
                          ),
                          Switch.adaptive(
                            value: widget.isMonitoring,
                            onChanged: (val) => widget.onToggle(),
                            activeColor: const Color(0xFF6366F1),
                            inactiveTrackColor: const Color(0xFF1E293B),
                          )
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 40),

                // 4. THREAT INTELLIGENCE FEED
                Text(
                  "Latest Scam Tactics",
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 140,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    children: [
                      _buildThreatCard(
                        "The FedEx/Customs Scam",
                        "Automated calls claiming a package contains illegal goods. Do not press 1.",
                        Icons.local_shipping_outlined,
                      ),
                      _buildThreatCard(
                        "TRAI Disconnection",
                        "Scammers impersonating telecom officials threatening to block your number.",
                        Icons.cell_tower,
                      ),
                      _buildThreatCard(
                        "WhatsApp Screen Share",
                        "Never share your screen while on a video call. They can read your OTPs.",
                        Icons.mobile_screen_share,
                      ),
                    ],
                  ),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Helper widget for the horizontal scrolling threat cards
  Widget _buildThreatCard(String title, String desc, IconData icon) {
    return Container(
      width: 260,
      margin: const EdgeInsets.only(right: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color(0xFF6366F1), size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.plusJakartaSans(
                    color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            desc,
            style: GoogleFonts.plusJakartaSans(color: Colors.grey[400], fontSize: 13, height: 1.4),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}