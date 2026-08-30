import os
from datetime import datetime

import whisper
from dotenv import load_dotenv
from openai import OpenAI

try:
    from backend.main import app
except Exception as e:
    print(f"Warning: could not import app from backend.main: {e}")

load_dotenv()


def transcribe_audio(audio_path: str, whisper_model: str = "medium") -> str:
    """
    Convert audio to English text using Whisper.
    """

    print("\nLoading Whisper model...")

    model = whisper.load_model(whisper_model)

    start_time = datetime.now()

    result = model.transcribe(
        audio_path,
        task="translate",  # Translate non-English speech to English
        fp16=False
    )

    end_time = datetime.now()

    elapsed = (end_time - start_time).total_seconds()

    print(f"\nTranscription completed in {elapsed:.2f} seconds")
    print(f"Detected language: {result['language']}")

    return result["text"]


def generate_summary(transcript: str) -> str:
    """
    Generate meeting summary using OpenRouter GPT-OSS-120B.
    """

    client = OpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1"
    )

    prompt = f"""
You are an expert meeting analyst and project manager.

Analyze the meeting transcript and generate:

# Meeting Summary
A concise summary of the discussion.

# Key Decisions
List important decisions.

# Risks / Blockers
List any blockers, concerns, or risks.

# Action Items
For each action item include:
- Assignee
- Task
- Deadline (if mentioned)

Meeting Transcript:

{transcript}
"""

    start_time = datetime.now()

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b:free",
        messages=[
            {
                "role": "system",
                "content": "You are an expert project manager."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    end_time = datetime.now()

    elapsed = (end_time - start_time).total_seconds()

    print(f"\nSummary generated in {elapsed:.2f} seconds")

    return response.choices[0].message.content


def main():

    audio_file = "test_audio.mp3"

    total_start = datetime.now()

    print("\n========== STEP 1: TRANSCRIPTION ==========")

    transcript = transcribe_audio(
        audio_file,
        whisper_model="medium"
    )

    print("\n========== TRANSCRIPT ==========\n")
    print(transcript)

    print("\n========== STEP 2: SUMMARY ==========")

    summary = generate_summary(transcript)

    print("\n========== AI SUMMARY ==========\n")
    print(summary)

    total_end = datetime.now()

    total_seconds = (total_end - total_start).total_seconds()

    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = total_seconds % 60

    print(
        f"\nTotal Processing Time: "
        f"{hours}h {minutes}m {seconds:.2f}s"
    )


if __name__ == "__main__":
    main()