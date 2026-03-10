# CallShield-AI: A Real-time LLM-driven Pipeline for Social Engineering Detection

### Abstract
Social engineering attacks via telephonic channels have grown increasingly sophisticated, exploiting human vulnerabilities rather than technical system flaws. Current defensive paradigms rely heavily on static blacklists and post-incident reporting, creating a critical "Detection Gap" for zero-day scam campaigns and dynamic impersonation tactics during live audio streams. CallShield-AI proposes a real-time, context-aware intervention system that evaluates conversational semantics mid-flight. By orchestrating a low-latency speech-to-text pipeline with advanced Large Language Model reasoning, this system detects psychological manipulation tactics and fraudulent intent, bridging the gap between static defense and active threat neutralization.

---

### Current Implementation Status (MVP)
The current version is a functional prototype utilizing Node.js for orchestration, Deepgram for high-speed STT, and the Gemini 2.5 Flash API for reasoning. It successfully demonstrates the end-to-end pipeline from audio ingestion to active scam notification, proving the viability of mid-call latency constraints.

---

### System Architecture

The system is composed of five distinct, loosely coupled layers. Each layer has a well-defined responsibility, allowing independent scaling and substitution of individual components without disrupting the broader pipeline.

#### High-Level Component Architecture

```mermaid
graph TD
    subgraph PSTN ["☎️ Telecommunication Layer"]
        A[Incoming Phone Call]
        B[Twilio PSTN Gateway]
    end

    subgraph BACKEND ["⚙️ Orchestration Layer — Node.js / Express"]
        C["/api/call — Initiate Outbound Call"]
        D["/api/twiml — TwiML Instruction Endpoint"]
        E["WebSocket /stream — Audio Ingestion"]
        F["Context Buffer\n(15-sentence Rolling Window)"]
        G["Trigger Logic\n(≥5 sentences AND ≥35 words)"]
        H["WebSocket /flutter-alerts — Alert Broadcast"]
        I["Monitoring State Manager\n(pause / resume)"]
    end

    subgraph STT ["🎙️ Speech Processing Layer — Deepgram Nova-2"]
        J["Inbound Stream\n(Customer Audio)"]
        K["Outbound Stream\n(Agent Audio)"]
    end

    subgraph LLM ["🧠 Reasoning Layer — Gemini 2.5 Flash"]
        L["Scam Probability Score\n(0–100)"]
        M["Flagged Tactics\nUrgency / Impersonation / Extraction"]
        N["Structured JSON Response\n(Schema-Enforced)"]
    end

    subgraph CLIENT ["📱 Mobile Client Layer — Flutter / Android"]
        O["Alert UI\n(Real-time Threat Display)"]
        P["Smart Alert Engine\n(Cooldown & Escalation Logic)"]
        Q["Hardware Alert Service\n(Vibration / Notifications)"]
        R["Local Storage\n(Alert History)"]
        S["Floating Bubble\n(Quick Monitoring Toggle)"]
    end

    A -->|Routes call| B
    B -->|POST /api/twiml| D
    D -->|Returns TwiML with stream URL| B
    B -->|Streams μ-law audio @ 8 kHz| E
    E -->|Routes inbound audio| J
    E -->|Routes outbound audio| K
    J -->|Final transcript| F
    K -->|Final transcript| F
    F --> G
    G -->|Threshold met| L
    L --> M --> N
    N -->|scam_probability > 60| H
    H -->|WebSocket push| O
    O --> P
    P -->|Triggers| Q
    P -->|Saves| R
    O --> S
    S -->|pause / resume command| I
    I -->|Gates audio forwarding| E
```

---

#### Detailed Data-Flow: Live Call Processing

```mermaid
sequenceDiagram
    autonumber
    participant Twilio   as ☎️ Twilio Gateway
    participant Node     as ⚙️ Orchestrator (Node.js)
    participant DG_In    as 🎙️ Deepgram — Inbound
    participant DG_Out   as 🎙️ Deepgram — Outbound
    participant Buffer   as 📝 Context Buffer
    participant Gemini   as 🧠 Gemini 2.5 Flash
    participant Flutter  as 📱 Flutter App

    Note over Flutter, Node: Flutter establishes persistent WebSocket on /flutter-alerts
    Flutter->>Node: Connect (wss://.../flutter-alerts)
    Node-->>Flutter: {"type":"SYSTEM","message":"Monitoring Active"}

    Note over Twilio, Node: Twilio streams dual-channel μ-law audio at 8 kHz
    Twilio->>Node: POST /api/twiml  (call answer webhook)
    Node-->>Twilio: TwiML — <Stream url="wss://.../stream"/>
    Twilio->>Node: Connect (wss://.../stream)

    loop For every audio packet during call
        Twilio->>Node: {"event":"media", "track":"inbound",  "payload":"<base64>"}
        Twilio->>Node: {"event":"media", "track":"outbound", "payload":"<base64>"}
        Node->>DG_In:  Raw PCM bytes (inbound)
        Node->>DG_Out: Raw PCM bytes (outbound)
    end

    loop Continuous transcription
        DG_In-->>Node:  Final transcript — "[INBOUND]: ..."
        DG_Out-->>Node: Final transcript — "[OUTBOUND]: ..."
        Node->>Buffer: Append formatted line
        Note over Buffer: Rolling window capped at 15 lines
    end

    alt Trigger condition met (≥5 sentences AND ≥35 new words)
        Node->>Gemini: Dispatch context buffer as prompt
        activate Gemini
        Gemini-->>Node: {scam_probability, flagged_tactics, explanation}
        deactivate Gemini

        alt scam_probability > 60
            Node->>Flutter: {"type":"ALERT","threatLevel":"CRITICAL|SUSPICIOUS","probability":..., "explanation":...}
            Flutter->>Flutter: SmartAlertEngine — cooldown & escalation check
            alt Hardware alert approved
                Flutter->>Flutter: Trigger vibration + push notification
            end
            Flutter->>Flutter: Render threat UI + persist to local storage
        end
    end

    opt User pauses monitoring via floating bubble
        Flutter->>Node: {"action":"pause_monitoring"}
        Note over Node: Audio packets dropped — Deepgram stays silent
    end
```

---

#### Architectural Design Principles

| Principle | Implementation |
| :--- | :--- |
| **Decoupled layers** | Each layer (telephony, orchestration, STT, LLM, client) communicates through well-defined interfaces (REST + WebSocket), enabling independent replacement or scaling of any single component. |
| **Asynchronous, non-blocking I/O** | Node.js event loop + WebSocket streams ensure audio ingestion never stalls while awaiting STT or LLM responses. |
| **Dual-channel STT** | Two independent Deepgram connections process the caller (inbound) and callee (outbound) tracks simultaneously, preserving per-speaker context for the reasoning engine. |
| **Rolling context window** | A 15-sentence sliding buffer passed to Gemini provides sufficient conversational context without unbounded token growth, preventing API quota exhaustion. |
| **Schema-enforced LLM output** | Gemini's `responseSchema` constraint forces structured JSON (`scam_probability`, `flagged_tactics`, `explanation`), eliminating brittle text-parsing logic. |
| **Smart Alert Engine (client-side)** | Progressive cooldown and escalation rules on the Flutter side prevent alert fatigue while guaranteeing immediate notification on threat escalation (SUSPICIOUS → CRITICAL). |
| **Bidirectional control channel** | The Flutter app sends `pause_monitoring` / `resume_monitoring` commands back up the WebSocket, creating a bidirectional control plane over a single persistent connection. |

---

#### Technology Stack

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| Telephony Gateway | **Twilio Programmable Voice** | Industry-standard PSTN programmability; supports real-time media streaming (`<Stream>`) natively. |
| Backend Orchestration | **Node.js + Express + ws** | Non-blocking event loop ideal for high-throughput I/O; minimal overhead for WebSocket bridging. |
| Speech-to-Text | **Deepgram Nova-2** | Sub-300 ms real-time transcription with μ-law 8 kHz support matching Twilio's codec directly. |
| AI Reasoning | **Gemini 2.5 Flash** | Low-latency, instruction-following LLM with native structured-output (JSON schema) enforcement. |
| Mobile Client | **Flutter (Android)** | Cross-platform Dart framework; `dash_bubble` enables persistent overlay monitoring during calls. |
| Local Persistence | **Flutter SharedPreferences** | Lightweight key-value store sufficient for alert history; no external database dependency. |

---

#### Repository Structure

```
CallShield-AI/
├── callshield_backend/          # Node.js orchestration server
│   ├── server.js                # HTTP + WebSocket entry point
│   ├── state.js                 # Global monitoring toggle
│   ├── routes/
│   │   └── callRoutes.js        # POST /api/call, POST /api/twiml
│   ├── controllers/
│   │   └── callController.js    # Twilio call initiation & TwiML generation
│   └── services/
│       └── streamHandler.js     # Deepgram bridging, context buffer, Gemini dispatch
│
└── callshield_app/              # Flutter Android application
    └── lib/
        ├── main.dart            # Alert UI + floating bubble
        ├── history_screen.dart  # Persistent alert log
        └── services/
            ├── alert_service.dart         # WebSocket client + stream controller
            ├── smart_alert_engine.dart    # Cooldown & escalation logic
            ├── hardware_alert_service.dart# Vibration + notification triggers
            └── storage_service.dart       # Local alert persistence
```

---

### Key Engineering Challenges

| Challenge | Implication | Architectural Mitigation |
| :--- | :--- | :--- |
| **End-to-End Latency** | Sequential processing of audio, transcription, and inference creates a "latency bottleneck," rendering mid-call intervention impossible. | Concurrent pipelining: the STT engine feeds the context buffer while the LLM analyzes asynchronously, prioritizing chunked context over full-sentence completion. |
| **Context vs. API Overhead** | Sending every transcribed word to the LLM exhausts API quotas and token limits; waiting for long pauses risks missing the intervention window. | Dynamic trigger logic fires analysis when ≥5 new sentences AND ≥35 new words have accumulated, balancing context richness against API cost. |
| **Accuracy Trade-offs** | Aggressive filtering yields False Positives (interrupting safe calls); passive filtering yields False Negatives (allowing scams to proceed). | Tunable probability threshold (default 60 %), multi-tier alert levels (SUSPICIOUS / CRITICAL), and client-side cooldown logic to minimize alert fatigue. |
| **Dual-speaker Attribution** | Merging both audio tracks into a single stream loses per-speaker context, degrading detection accuracy. | Two independent Deepgram WebSocket connections process inbound and outbound tracks in parallel; transcripts are tagged `[INBOUND]` / `[OUTBOUND]` before buffering. |
| **User Agency vs. Protection** | A fully autonomous system may alert during sensitive-but-legitimate calls (e.g., medical, legal). | The floating-bubble toggle lets users instantly pause and resume AI monitoring without leaving the active call screen. |

---

### Methodology: Heuristic Logic & Scam Indicators
The detection mechanism moves beyond static filtering by employing heuristic logic mapped to established social engineering frameworks. The reasoning engine continuously evaluates the conversational transcript against a matrix of psychological triggers:

* **Artificial Urgency & Coercion:** Detecting semantic patterns designed to bypass logical reasoning, such as artificial time constraints, threats of legal action, or account suspension warnings.
* **Financial & Data Requests:** Flagging unwarranted transitions toward the extraction of sensitive information (e.g., OTPs, bank routing numbers) or immediate financial transfers.
* **Authority Impersonation:** Analyzing the dialogue for contextual inconsistencies common when callers attempt to masquerade as government officials, bank representatives, or technical support.

---

### Evaluation Strategy
To rigorously validate the pipeline's detection capabilities and latency constraints, the system was benchmarked against varied simulated scam taxonomies.

| Scenario | Success Rate | Avg. Detection Latency |
| :--- | :--- | :--- |
| **Banking/KYC Scam** | 100% (5/5) | 2.3 Seconds |
| **Lottery/Prize Scam** | 80% (4/5) | 3.1 Seconds |
| **Normal/Benign Call** | 100% (5/5) | N/A (No False Alarms) |

---

### Demo & UI

![CallShield-AI Alert UI](Screenshot.png)

*Figure 1: Real-time alert triggered when the system detects a 'Sense of Urgency' combined with a 'Financial Request'.*

<br>

![Threat Dashboard](Screenshot-2.png)

*Figure 2: Mobile interface of the Threat Dashboard displaying high-confidence alerts (99%+ match) generated by the reasoning engine in response to severe coercion and OTP requests.*

---

### Future Research Directions
1.  **On-device tinyML Inference:** Transitioning the initial classification layer to edge devices to drastically reduce latency and preserve user privacy by minimizing cloud reliance for benign calls.
2.  **Multi-lingual Support for Regional Dialects:** Expanding the STT and LLM pipelines to natively process code-mixed languages and regional dialects (e.g., Hindi-English) critical for deployment in the Indian telecommunications landscape.
3.  **Acoustic Feature Integration:** Augmenting the semantic text analysis with parallel acoustic evaluation to detect vocal stress, synthetic voice generation (deepfakes), and abnormal cadences.