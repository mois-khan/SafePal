const fs = require('fs');
const path = require('path');
const WaveFile = require('wavefile').WaveFile;

// ---------------- CONFIGURATION ----------------
// filename of your raw audio (without the path, just name)
const INPUT_FILENAME = 'CA2decbf9a252db1e6dae049de8189e79e.ulaw'; 
// -----------------------------------------------

const recordingsDir = path.join(__dirname, 'recordings');
const inputFile = path.join(recordingsDir, INPUT_FILENAME);
const outputFile = path.join(recordingsDir, INPUT_FILENAME.replace('.ulaw', '_fixed.wav'));

try {
    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Error: File not found: ${inputFile}`);
        process.exit(1);
    }

    // 1. Read the raw Mu-Law data
    const rawBuffer = fs.readFileSync(inputFile);

    // 2. Create a new WaveFile instance
    const wav = new WaveFile();

    // 3. Tell it: "This data is 8000Hz, 8-bit, Mono, and it is Mu-Law"
    wav.fromScratch(1, 8000, '8m', rawBuffer);

    // 4. TRANSCODE: Convert it to 16-bit PCM (Standard WAV)
    // This fixes the "robotic/static" sound
    wav.fromMuLaw(); 

    // 5. Save the file
    fs.writeFileSync(outputFile, wav.toBuffer());

    console.log(`✅ Success! Converted to clean audio: ${outputFile}`);
    console.log(`🎵 Try playing this new '_fixed.wav' file.`);

} catch (error) {
    console.error('Error converting file:', error);
}