class SmartAlertEngine {
  DateTime? _lastAlertTime;
  String _lastThreatLevel = 'SAFE';
  int _consecutiveAlerts = 0;

  // This function returns TRUE if we should vibrate/beep, and FALSE if we should stay silent
  bool shouldTriggerHardwareAlert(String incomingThreatLevel) {
    DateTime now = DateTime.now();

    // RULE 1: First ever alert? Always trigger.
    if (_lastAlertTime == null) {
      _updateState(now, incomingThreatLevel);
      return true;
    }

    // RULE 2: Escalation! (It was Suspicious, now it's CRITICAL). Always trigger immediately.
    if (_lastThreatLevel == 'SUSPICIOUS' && incomingThreatLevel == 'CRITICAL') {
      print('🚨 ESCALATION DETECTED! Bypassing cooldown.');
      _updateState(now, incomingThreatLevel);
      return true;
    }

    // RULE 3: The Cooldown Logic
    int secondsSinceLastAlert = now.difference(_lastAlertTime!).inSeconds;
    int requiredCooldown = _calculateCooldown(incomingThreatLevel);

    if (secondsSinceLastAlert >= requiredCooldown) {
      _updateState(now, incomingThreatLevel);
      return true;
    } else {
      int secondsLeft = requiredCooldown - secondsSinceLastAlert;
      print('⏳ Suppressing alert. Cooldown active for $secondsLeft more seconds.');
      return false; // Stay silent, don't spam the user
    }
  }

  // Progressive Cooldown Math
  int _calculateCooldown(String threatLevel) {
    // If it's a critical threat, we wait 8 seconds between repeat alerts.
    // If it's just suspicious, we give them 15 seconds of peace.
    int baseCooldown = (threatLevel == 'CRITICAL') ? 8 : 15;

    // If they've been warned 3 times already, start doubling the cooldown
    // so we don't annoy them while they try to hang up.
    if (_consecutiveAlerts > 2) {
      return baseCooldown * 2;
    }
    return baseCooldown;
  }

  void _updateState(DateTime time, String level) {
    if (_lastThreatLevel == level) {
      _consecutiveAlerts++;
    } else {
      _consecutiveAlerts = 1; // Reset counter if threat level changed
    }
    _lastAlertTime = time;
    _lastThreatLevel = level;
  }

  // Call this when the phone call actually ends to reset the engine
  void reset() {
    _lastAlertTime = null;
    _lastThreatLevel = 'SAFE';
    _consecutiveAlerts = 0;
  }
}