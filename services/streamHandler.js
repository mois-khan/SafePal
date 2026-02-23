require('dotenv').config(); 
const WebSocket = require('ws');

const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

// Initialize the Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the exact JSON structure we want back
const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        scam_probability: { 
            type: SchemaType.INTEGER, 
            description: "A score from 0 to 100 indicating the likelihood of this being a scam." 
        },
        flagged_tactics: { 
            type: SchemaType.ARRAY, 
            items: { type: SchemaType.STRING },
            description: "List of identified tactics like 'Urgency', 'Impersonation', 'Financial Extraction'." 
        },
        explanation: { 
            type: SchemaType.STRING, 
            description: "A strict, 1-sentence explanation of why this score was given." 
        }
    },
    required: ["scam_probability", "flagged_tactics", "explanation"]
};

// Configure the model - "Gemini-2.5-flash"
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are a real-time cybersecurity AI monitoring a live phone call. Analyze the provided transcript snippet. Detect signs of social engineering, scams, or fraud. You must strictly return the requested JSON format and nothing else.",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
    },
});

// The execution function
const evaluateWithGemini = async (transcriptBlock) => {
    const result = await model.generateContent(transcriptBlock);
    const jsonText = result.response.text();
    return JSON.parse(jsonText); // Returns a clean JavaScript object
};

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
        if (newSentenceCount >= 5 && newWordCount >= 35) {
            
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
                try {
                // Call Gemini
                const analysis = await evaluateWithGemini(transcriptPayload);
                
                console.log("✅ [GEMINI] Analysis Complete:");
                console.log(`🚨 Scam Probability: ${analysis.scam_probability}%`);
                console.log(`🚩 Tactics: ${analysis.flagged_tactics.join(', ') || 'None'}`);
                console.log(`📝 Reasoning: ${analysis.explanation}\n`);

                // Unlock the engine for the next batch
                isGeminiProcessing = false; 

                } catch (error) {
                    console.error("❌ [GEMINI] API Error:", error.message);
                    isGeminiProcessing = false; // Always unlock on failure
                }

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