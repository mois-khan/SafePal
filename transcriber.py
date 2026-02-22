import asyncio
import websockets
import json
import base64
import io
import soundfile as sf
import librosa
import numpy as np
from faster_whisper import WhisperModel

# 1. LOAD THE AI MODEL
# "tiny.en" or "base.en" are incredibly fast for local CPU processing.
# If you have an NVIDIA GPU, you can change device="cuda" and compute_type="float16"
print("⏳ Loading Faster-Whisper model into memory...")
whisper_model = WhisperModel("base.en", device="cpu", compute_type="int8")
print("✅ Whisper Model loaded successfully!")

# Wrapper function to run Whisper synchronously
def transcribe_chunk(audio_array):
    # vad_filter=True tells Whisper to ignore pure silence!
    segments, _ = whisper_model.transcribe(
        audio_array, 
        beam_size=5,
        language="en",
        vad_filter=True,
        condition_on_previous_text=False
    )
    
    # Combine all transcribed segments into one string
    return " ".join([segment.text for segment in segments]).strip()

async def handle_audio_stream(websocket):
    print("📞 Call Connected! Listening for audio...")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                track = data.get("track", "unknown")
                b64_string = data.get("payload")

                if not b64_string: continue

                raw_bytes = base64.b64decode(b64_string)
                
                with io.BytesIO(raw_bytes) as byte_io:
                    audio_float32, _ = sf.read(
                        byte_io, samplerate=8000, channels=1,          
                        format='RAW', subtype='ULAW', dtype='float32'      
                    )
                
                audio_16k = librosa.resample(y=audio_float32, orig_sr=8000, target_sr=16000)
                
                # ---------------------------------------------------------
                # 🧠 RUN FASTER-WHISPER
                # We use asyncio.to_thread so the heavy AI math doesn't 
                # freeze the WebSocket connection while it's thinking.
                # ---------------------------------------------------------
                transcribed_text = await asyncio.to_thread(transcribe_chunk, audio_16k)

                # Only send a response back if Whisper actually heard words
                if transcribed_text:
                    print(f"🎯 [{track.upper()}]: {transcribed_text}")
                    
                    response = {
                        "status": "success",
                        "track": track,
                        "text": transcribed_text
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
    print("🚀 Python AI Server running on ws://localhost:4000")
    await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())