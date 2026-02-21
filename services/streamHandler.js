const fs = require("fs");
const path = require("path");
const WebSocket = require("ws"); // Required to connect to Python

/**
 * Handles the WebSocket connection for a specific call stream.
 * @param {WebSocket} ws - The WebSocket connection
 */
const handleStream = (ws) => {
  console.log("[StreamService] New Client Connected");

  let writeStream = null;
  let callSid = null;

  // --- BATCHING SETUP ---
  let audioBufferArray = []; // The bucket to hold our 20ms chunks
  let currentBatchSize = 0; // Keep track of how many bytes we have
  const TARGET_BATCH_SIZE = 8000; // 8000 bytes = 1 full second of audio

  console.log("[StreamService] Twilio Call Connected");

  // 1. Connect to your Python Server
  const pythonWs = new WebSocket("ws://localhost:4000");

  pythonWs.on("open", () => {
    console.log("🔗 Connected to Python Transcriber");
  });

  // 2. Listen for Transcriptions coming BACK from Python
  pythonWs.on("message", (data) => {
    const result = JSON.parse(data);
    console.log(`📝 Transcription Result: "${result.text}"`);
  });

  ws.on("message", (message) => {
    try {
      const msg = JSON.parse(message);
      // console.log(message)
      // console.log(msg)

      switch (msg.event) {
        case "start":
          console.log(`[StreamService] Stream started: ${msg.start.streamSid}`);
          callSid = msg.start.callSid;
          break;
        
          // Important
        case "media":
          // Twilio sends audio in base64 encoded chunks
          if (msg.media.payload) {
            const chunk = Buffer.from(msg.media.payload, "base64");
            // writeStream.write(audioBuffer);

            audioBufferArray.push(chunk);
            currentBatchSize += chunk.length;

            // 3. Check if the bucket is full (reached 1 second)
            if (currentBatchSize >= TARGET_BATCH_SIZE) {
              // 4. Merge all the tiny chunks into one big Buffer
              const batchedBuffer = Buffer.concat(audioBufferArray);

              // 3. SEND THE BATCH TO PYTHON (Send as raw binary)
              if (pythonWs.readyState === WebSocket.OPEN) {
                pythonWs.send(batchedBuffer);
              }

              // 6. Empty the bucket for the next batch
              audioBufferArray = [];
              currentBatchSize = 0;
            }
          }
          break;

        case "stop":
          console.log(`[StreamService] Stream stopped for CallSid: ${callSid}`);
          break;
      }
    } catch (error) {
      console.error("[StreamService] Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("[StreamService] Client Disconnected");
    if (pythonWs.readyState === WebSocket.OPEN) {
      pythonWs.close();
    }
  });
};

module.exports = { handleStream };
