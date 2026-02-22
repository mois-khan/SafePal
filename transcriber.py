import asyncio
import websockets
import json
import base64
import io
import soundfile as sf
import librosa
import numpy as np

async def handle_audio_stream(websocket):
    print("✅ Node.js connected to Python Transcription Server!")
    
    try:
        async for message in websocket:
            try:
                # 1. PARSE THE INCOMING MESSAGE
                # Assuming Node.js sends a JSON object like: {"payload": "UklGRi..."}
                data = json.loads(message)
                b64_string = data.get("payload")

                if not b64_string:
                    continue

                # 2. DECODE BASE64 TO RAW BYTES
                raw_bytes = base64.b64decode(b64_string)
                
                # 3. READ MU-LAW AND CONVERT DIRECTLY TO FLOAT32
                # We wrap the bytes in io.BytesIO so soundfile treats it like a file.
                # We MUST specify the format because the bytes have no WAV headers.
                with io.BytesIO(raw_bytes) as byte_io:
                    audio_float32, _ = sf.read(
                        byte_io,
                        samplerate=8000,     # Twilio's sample rate
                        channels=1,          # Mono audio
                        format='RAW',        # No headers
                        subtype='ULAW',     # Mu-Law compression
                        dtype='float32'      # Instantly normalizes to between -1.0 and 1.0
                    )
                
                # 4. UPSAMPLE FROM 8kHz to 16kHz
                # librosa handles the math to stretch the audio without distorting it
                audio_16k = librosa.resample(
                    y=audio_float32, 
                    orig_sr=8000, 
                    target_sr=16000
                )

                # ---------------------------------------------------------
                # 🎯 SUCCESS! YOU NOW HAVE YOUR ARRAY
                # audio_16k is a standard float32 numpy array.
                # ---------------------------------------------------------
                
                print(f"📦 Processed array shape: {audio_16k.shape}, dtype: {audio_16k.dtype}")
                
                # Example: Feed this directly into Whisper
                # result = whisper_model.transcribe(audio_16k)
                # simulated_text = result["text"]

                simulated_text = "Processing 16kHz audio chunk..."

                # 5. SEND RESULT BACK TO NODE.JS
                response = {
                    "status": "success",
                    "text": simulated_text
                }
                await websocket.send(json.dumps(response))

            except websockets.exceptions.ConnectionClosed:
                print("🏁 Call ended gracefully. Node.js closed the connection.")
                break # Exit the loop safely

            except Exception as processing_error:
                print(f"⚠️ Error processing audio chunk: {processing_error}")

    except websockets.exceptions.ConnectionClosed:
        print("❌ Node.js disconnected.")

async def main():
    # Start the server on port 4000
    server = await websockets.serve(handle_audio_stream, "localhost", 4000)
    print("🚀 Python Audio Processing Server running on ws://localhost:4000")
    await asyncio.Future()  # Keep the server running forever

if __name__ == "__main__":
    asyncio.run(main())