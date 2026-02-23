require('dotenv').config(); 
const WebSocket = require('ws');

// ==========================================
    // 🧠 1. THE COGNITIVE ENGINE STATE
    // ==========================================
    let contextBuffer = [];
    let newSentenceCount = 0;
    let newWordCount = 0;
    let isGeminiProcessing = false; // The Concurrency Lock
    const MAX_BUFFER_SIZE = 15;     // The Smart Array Ceiling

    // ==========================================
    // ⚙️ 2. THE BUFFERING LOGIC
    // ==========================================
    const processTranscript = async (speaker, text) => {
        // 1. Format and push the new sentence
        const formattedLine = `[${speaker.toUpperCase()}]: ${text}`;
        contextBuffer.push(formattedLine);
        
        // 2. Increment our hybrid counters
        newSentenceCount++;
        newWordCount += text.split(/\s+/).length; // Counts words by splitting on spaces

        // 3. The Smart Array: Enforce the 15-line ceiling
        if (contextBuffer.length > MAX_BUFFER_SIZE) {
            contextBuffer.shift(); // Drops the oldest line
        }

        // 4. The Hybrid Trigger: Wait for actual substance, not just "Uh-huh"
        if (newSentenceCount >= 3 && newWordCount >= 20) {
            
            // 5. The Concurrency Lock: Prevent race conditions
            if (isGeminiProcessing) {
                console.log("⏳ [BUFFER] Gemini is busy. Holding text for the next trigger...");
                return;
            }

            // Lock the engine
            isGeminiProcessing = true;
            
            // Snapshot the current conversation
            const transcriptPayload = contextBuffer.join('\n');
            
            // Instantly reset counters so Node.js can track new incoming text while Gemini thinks
            newSentenceCount = 0;
            newWordCount = 0;

            console.log("\n🚀 [TRIGGER] Firing Payload to Gemini...");
            console.log("--- SNAPSHOT ---");
            console.log(transcriptPayload);
            console.log("----------------");

            try {
                // We will plug the actual Gemini API call here in the next step
                // const result = await evaluateWithGemini(transcriptPayload);
                
                // Mocking the Gemini network delay for now (2 seconds)
                setTimeout(() => {
                    console.log("✅ [GEMINI] Mock Analysis Complete. Lock released.\n");
                    isGeminiProcessing = false; // Unlock the engine
                }, 2000);

            } catch (error) {
                console.error("❌ [GEMINI] API Error:", error);
                isGeminiProcessing = false; // Always unlock on failure so the system doesn't freeze
            }
        }
    };

const api = process.env.DEEPGRAM_API_KEY
const handleStream = (ws) => {
    console.log('[StreamService] Twilio Call Connected');
    
    // Helper function to spawn a Deepgram connection for a specific track
    const createDeepgramStream = (trackName) => {
        // We tell Deepgram exactly what Twilio is sending: 8000Hz Mu-Law
        const deepgramUrl = 'wss://api.deepgram.com/v1/listen?encoding=mulaw&sample_rate=8000&channels=1&model=nova-2&smart_format=true';
        
        // API key
        const dgSocket = new WebSocket(deepgramUrl, {
            headers: { Authorization: `Token ${api}` }
        });

        dgSocket.on('open', () => console.log(`🔗 Deepgram connected for ${trackName}`));
        
        dgSocket.on('message', (data) => {
            const response = JSON.parse(data);
            
            if (response.is_final && response.channel && response.channel.alternatives[0].transcript) {
                const transcript = response.channel.alternatives[0].transcript;
                
                // We still log the raw output to the terminal so you can read it
                console.log(`🗣️ [${trackName.toUpperCase()}]: ${transcript}`);
                
                // 🚨 ADD THIS: Pipe the text directly into our Cognitive Engine
                processTranscript(trackName, transcript);
            }
        });

        dgSocket.on('error', (err) => console.error(`❌ Deepgram Error (${trackName}):`, err.message));
        
        // 🚨 ADDED: Catches HTTP rejections BEFORE the connection opens
        dgSocket.on('unexpected-response', (req, res) => {
            console.error(`🛑 Deepgram Connection Rejected (${trackName}). HTTP Status: ${res.statusCode}`);
            if (res.statusCode === 401) console.error("   -> Reason: Your API Key is missing, invalid, or out of credits.");
            if (res.statusCode === 400) console.error("   -> Reason: Bad Request (Check URL parameters).");
            if (res.statusCode === 403) console.error("   -> Reason: Forbidden. You might have pasted a Project ID instead of an API Key.");
        });

        return dgSocket;
    };

    // Spawn the Twin Streams
    const dgInbound = createDeepgramStream('inbound');   // Customer
    const dgOutbound = createDeepgramStream('outbound'); // Agent

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);

            if (msg.event === 'media' && msg.media.payload) {
                const track = msg.media.track; 
                
                // Decode the base64 payload into raw binary bytes
                const rawAudio = Buffer.from(msg.media.payload, 'base64');
                
                // Fire the raw bytes directly to the correct Deepgram stream instantly
                if (track === 'inbound' && dgInbound.readyState === WebSocket.OPEN) {
                    dgInbound.send(rawAudio);
                } else if (track === 'outbound' && dgOutbound.readyState === WebSocket.OPEN) {
                    dgOutbound.send(rawAudio);
                }
            }
        } catch (error) {
            console.error('Error in Node.js stream handler:', error);
        }
    });

    ws.on('close', () => {
        console.log('[StreamService] Twilio Call Ended');
        if (dgInbound.readyState === WebSocket.OPEN) dgInbound.close();
        if (dgOutbound.readyState === WebSocket.OPEN) dgOutbound.close();
    });
};

module.exports = { handleStream };