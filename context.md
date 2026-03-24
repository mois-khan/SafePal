# CallShield AI - Project Context & Progress
**Last Updated:** March 2026
**Project Type:** Real-time Scam Detection & Prevention System
**Platform:** Flutter (Frontend) + Node.js (Backend)

## 📌 1. Project Overview
CallShield AI is a real-time, privacy-first mobile security application. It intercepts active phone calls, transcribes the audio in real-time using Deepgram, analyzes the conversation for social engineering/scam tactics using Google Gemini, and instantly triggers native hardware responses (Local Notifications, SOS SMS, and soon Auto-Hangup) via a Flutter Background Service.

## 🏗️ 2. Tech Stack & Architecture
* **Frontend Mobile:** Flutter (Dart)
* **Backend Server:** Node.js (Express, WebSockets)
* **Telephony Intercept:** Twilio (TwiML Media Streams)
* **Speech-to-Text (STT):** Deepgram (Nova-2 Model, Twin-channel streaming, optimized with `en-IN` for Indian/Hinglish accents)
* **AI Engine:** Google Gemini (Gemini 1.5 Flash via `@google/generative-ai` to ensure ultra-low latency and bypass free-tier rate limits)
* **Native Hardware APIs:** `flutter_background_service`, `sms_sender_background`, `flutter_local_notifications`

## 🔄 3. Core Data Flow (The Pipeline)
1.  **Audio Capture:** Twilio routes live inbound/outbound audio over a WebSocket (`/stream`) to the Node.js backend.
2.  **Transcription:** Node.js pipes the raw audio to Deepgram via twin WebSocket streams.
3.  **Privacy Scrubbing (Zero-Knowledge):** Deepgram returns raw text. Node.js intercepts it using a RegEx Sniper to redact PII (Credit Cards, Aadhaar, SSNs, OTPs) *before* it leaves the server.
4.  **Live UI Broadcast:** Node.js instantly broadcasts the scrubbed transcript chunks down to the Flutter app's Live Radar.
5.  **Threat Analysis:** The scrubbed text buffer is sent to Gemini. Gemini returns a JSON threat payload (Probability %, Tactics, Explanation).
6.  **Device Broadcast:** If Threat > 60%, Node.js broadcasts an `ALERT` payload over WebSocket (`/flutter-alerts`) to the Flutter app.
7.  **Background Execution:** The Flutter Isolate (running in the background) catches the alert, updates the UI, pops a Local Notification, and uses native Android Telephony to send a physical SMS to the user's saved SOS contact.

---

## ✅ 4. Completed Milestones (What Works)

### Backend (Node.js)
* [x] **Twilio Stream Handler:** Successfully ingests live call audio.
* [x] **Deepgram Integration:** Dual-channel (Inbound/Outbound) real-time STT natively accepting raw `mu-law` binary.
* [x] **Gemini Analysis Engine:** 4-second latency sliding window buffer analysis.
* [x] **WebSocket Broadcast Server:** Pipes both Live Transcripts and Threat Alerts down to active Flutter clients.
* [x] **Zero-Knowledge Scrubber:** RegEx middleware successfully intercepts and redacts sensitive data (e.g., `[OTP_OR_PIN_REDACTED]`) before AI analysis.

### Frontend (Flutter)
* [x] **The Live Threat Radar (Show, Don't Tell):** Built a "Cybersecurity War Room" UI. Features an auto-scrolling terminal intercept log and a dynamic Threat Gauge that spikes to 95% and glows red when an attack is detected.
* [x] **Background Service:** App runs a headless Isolate that survives app minimization and screen locks.
* [x] **UI-Isolate Bridge:** Bi-directional communication. UI updates dynamically on connection loss; UI pushes instant SOS updates to the Isolate.
* [x] **Native SOS SMS:** Bypassed Android 14 Broadcast Receiver limits using modern `sms_sender_background` package. Texts send securely without UI prompts.
* [x] **The "Answering Machine":** If a threat hits while the app is asleep, the Isolate saves the alert to `SharedPreferences`. The `WidgetsBindingObserver` catches it on wake-up and guarantees the Red Scam Banner is displayed.

---

## 🛠️ 5. Key Engineering Solutions (Do Not Revert)
* **The "JSON DDOS" & Firewall Trap:** We intentionally use Deepgram over Sarvam AI. Venue Wi-Fi firewalls often block outbound WebSockets, requiring Mobile Hotspot/WARP bypasses. Furthermore, Deepgram natively accepts continuous `mu-law` binary streams, whereas other APIs (like Sarvam) require complex base64 JSON chunking that frequently triggers rate-limit disconnects (`Code 1000`).
* **The Gemini Rate-Limit Pivot:** We explicitly use `gemini-1.5-flash-latest`. Newer/heavier models (like 2.5-flash) strictly cap at 20 requests per day on the free tier, which causes a `429 Quota Exceeded` crash mid-call. 1.5-flash handles 1,500 requests a day perfectly.
* **The SMS Silent Crash:** Older packages like `telephony` crash silently on Android 14+ due to `RECEIVER_EXPORTED` broadcast rules. We *must* use `sms_sender_background`.
* **Emoji/Length Limits:** SMS strings are strictly under 160 characters and contain NO emojis to prevent the modem from switching to UCS-2 encoding (which limits texts to 70 chars and causes silent failures).

---

## 🚀 6. Hackathon Roadmap / Pending Features

### Phase 2: "Grandma Mode" (Auto-Hangup Kill Switch)
* **Goal:** Use native Android Telecom APIs (or MethodChannels) to forcefully terminate the active cellular call if the Gemini Threat Level hits 99%.
* **Challenge:** Android aggressively restricts call-termination APIs. Will require investigating `TelecomManager` or specific Android intent broadcast workarounds.

### Phase 3: The Dopamine Hit (Post-Call Threat Report)
* **Goal:** A beautiful, gamified "Threat Neutralized" pop-up receipt displaying the Attacker Profile, Time-to-Detection, and exact PII saved.

### Phase 4: The Counter-Attack (Automated Cyber Cell Reporting)
* **Goal:** Package the intercepted forensic evidence (Transcript, Caller ID, Gemini Tactics) into a PDF and route it seamlessly to the National Cyber Crime portal via a 1-click auto-drafted email.