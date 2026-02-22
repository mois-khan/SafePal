require('dotenv').config(); 
const WebSocket = require('ws');

// console.log(process.env.DEEPGRAM_API_KEY)

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
            
            // We only want to log the finalized sentences, not the partial guesses
            if (response.is_final && response.channel && response.channel.alternatives[0].transcript) {
                const transcript = response.channel.alternatives[0].transcript;
                console.log(`🎯 [${trackName.toUpperCase()}]: ${transcript}`);
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