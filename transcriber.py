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
                # 1. PARSE THE NEW JSON FORMAT
                data = json.loads(message)
                track = data.get("track", "unknown")
                b64_string = data.get("payload")

                if not b64_string:
                    continue

                # 2. DECODE BASE64
                raw_bytes = base64.b64decode(b64_string)
                
                # 3. CONVERT MU-LAW TO FLOAT32
                with io.BytesIO(raw_bytes) as byte_io:
                    audio_float32, _ = sf.read(
                        byte_io,
                        samplerate=8000,     
                        channels=1,          
                        format='RAW',        
                        subtype='ULAW',     
                        dtype='float32'      
                    )
                
                # 4. UPSAMPLE TO 16kHz
                audio_16k = librosa.resample(
                    y=audio_float32, 
                    orig_sr=8000, 
                    target_sr=16000
                )
                
                print(f"📦 [{track.upper()}] Processed {audio_16k.shape[0]} samples.")
                
                # ---------------------------------------------------------
                # 🧠 AI PROCESSING HAPPENS HERE
                # e.g., result = model.transcribe(audio_16k)
                # ---------------------------------------------------------
                simulated_text = f"Simulated transcription of 1s audio."

                # 5. SEND RESULT BACK WITH TRACK INFO
                response = {
                    "status": "success",
                    "track": track,
                    "text": simulated_text
                }
                await websocket.send(json.dumps(response))

            except websockets.exceptions.ConnectionClosed:
                print("🏁 Call ended gracefully.")
                break
            except Exception as e:
                print(f"⚠️ Error processing audio chunk: {e}")

    except websockets.exceptions.ConnectionClosed:
        print("❌ Node.js disconnected.")

async def main():
    server = await websockets.serve(handle_audio_stream, "localhost", 4000)
    print("🚀 Python Audio Processing Server running on ws://localhost:4000")
    await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())