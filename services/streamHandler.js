const WebSocket = require('ws');

const handleStream = (ws) => {
    console.log('[StreamService] Twilio Call Connected');
    
    // Connect to Python Transcriber
    const pythonWs = new WebSocket('ws://localhost:4000');
    
    pythonWs.on('open', () => console.log('🔗 Connected to Python Transcriber'));
    
    pythonWs.on('error', (error) => {
        console.error('❌ Python WebSocket Error:', error.message);
    });

    pythonWs.on('message', (data) => {
        const result = JSON.parse(data);
        // Log who is speaking based on the track!
        console.log(`🗣️ [${result.track.toUpperCase()}]: ${result.text}`);
    });

    // --- THE TWIN BUCKETS ---
    // Inbound = Customer | Outbound = Agent (You)
    const buffers = {
        inbound: { array: [], size: 0 },
        outbound: { array: [], size: 0 }
    };
    const TARGET_BATCH_SIZE = 8000; // 1 second of audio

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);

            if (msg.event === 'media' && msg.media.payload) {
                // 1. Identify who is speaking
                const track = msg.media.track; // Will be "inbound" or "outbound"
                
                // 2. Decode the chunk
                const chunk = Buffer.from(msg.media.payload, 'base64');
                
                // 3. Drop it into the correct bucket
                if (buffers[track]) {
                    buffers[track].array.push(chunk);
                    buffers[track].size += chunk.length;

                    // 4. Check if THIS SPECIFIC bucket is full
                    if (buffers[track].size >= TARGET_BATCH_SIZE) {
                        const batchedBuffer = Buffer.concat(buffers[track].array);
                        const base64Batch = batchedBuffer.toString('base64');
                        
                        // 5. SEND TO PYTHON WITH TRACK INFO
                        if (pythonWs.readyState === WebSocket.OPEN) {
                            pythonWs.send(JSON.stringify({ 
                                track: track, 
                                payload: base64Batch 
                            }));
                        }
                        
                        // 6. Empty ONLY this bucket
                        buffers[track].array = []; 
                        buffers[track].size = 0;  
                    }
                }
            }
        } catch (error) {
            console.error('Error in Node.js stream handler:', error);
        }
    });

    ws.on('close', () => {
        console.log('[StreamService] Twilio Call Ended');
        if (pythonWs.readyState === WebSocket.OPEN) pythonWs.close();
    });
};

module.exports = { handleStream };