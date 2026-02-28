const fs = require('fs');
const path = require('path');

// ---------------- CONFIGURATION ----------------
// CHANGE THIS to the filename you see in your 'recordings' folder
const INPUT_FILENAME = 'CA81d72fb08c901d4fe8bb528823e8ec04.ulaw'; 
// -----------------------------------------------

const recordingsDir = path.join(__dirname, 'recordings');
const inputFile = path.join(recordingsDir, INPUT_FILENAME);
const outputFile = path.join(recordingsDir, INPUT_FILENAME.replace('.ulaw', '.wav'));

// Helper function to create a valid WAV header for Mu-Law (Format Code 7)
function createWavHeader(dataLength) {
    const buffer = Buffer.alloc(44);

    // 1. RIFF Chunk Descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4); // File size - 8
    buffer.write('WAVE', 8);

    // 2. fmt Sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);     // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(7, 20);      // AudioFormat (7 = Mu-Law, 1 = PCM)
    buffer.writeUInt16LE(1, 22);      // NumChannels (Mono)
    buffer.writeUInt32LE(8000, 24);   // SampleRate (8000Hz)
    buffer.writeUInt32LE(8000, 28);   // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    buffer.writeUInt16LE(1, 32);      // BlockAlign (NumChannels * BitsPerSample/8)
    buffer.writeUInt16LE(8, 34);      // BitsPerSample (8 bits for Mu-Law)

    // 3. data Sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40); // Subchunk2Size (NumSamples * NumChannels * BitsPerSample/8)

    return buffer;
}

// Main Execution
try {
    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Error: File not found: ${inputFile}`);
        process.exit(1);
    }

    const rawAudio = fs.readFileSync(inputFile);
    const header = createWavHeader(rawAudio.length);
    
    // Combine Header + Raw Audio
    const wavData = Buffer.concat([header, rawAudio]);

    fs.writeFileSync(outputFile, wavData);
    
    console.log(`✅ Success! Converted to: ${outputFile}`);
    console.log(`🎵 You can now play this file in VLC or Windows Media Player.`);

} catch (error) {
    console.error('Error converting file:', error);
}