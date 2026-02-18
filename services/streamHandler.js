const fs = require('fs');
const path = require('path');

// Ensure recordings directory exists
const RECORDINGS_DIR = path.join(__dirname, '../recordings');
if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR);
}

/**
 * Handles the WebSocket connection for a specific call stream.
 * @param {WebSocket} ws - The WebSocket connection
 */
const handleStream = (ws) => {
    console.log('[StreamService] New Client Connected');
    
    let writeStream = null;
    let callSid = null;

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);

            switch (msg.event) {
                case 'start':
                    console.log(`[StreamService] Stream started: ${msg.start.streamSid}`);
                    callSid = msg.start.callSid;
                    
                    // Create a write stream to save raw audio (Mu-law 8khz)
                    // Filename will be the CallSid.ulaw
                    const filePath = path.join(RECORDINGS_DIR, `${callSid}.ulaw`);
                    writeStream = fs.createWriteStream(filePath);
                    console.log(`[StreamService] Recording to: ${filePath}`);
                    break;

                case 'media':
                    // Twilio sends audio in base64 encoded chunks
                    if (writeStream && msg.media.payload) {
                        const audioBuffer = Buffer.from(msg.media.payload, 'base64');
                        writeStream.write(audioBuffer);
                    }
                    break;

                case 'stop':
                    console.log(`[StreamService] Stream stopped for CallSid: ${callSid}`);
                    if (writeStream) {
                        writeStream.end();
                        writeStream = null;
                    }
                    break;
            }
        } catch (error) {
            console.error('[StreamService] Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('[StreamService] Client Disconnected');
        if (writeStream) writeStream.end();
    });
};

module.exports = { handleStream };