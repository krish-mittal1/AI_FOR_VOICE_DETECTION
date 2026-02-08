import base64
import io
import numpy as np
import librosa
from tensorflow import keras
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "model" / "final_model.keras"
model = keras.models.load_model(MODEL_PATH)


class AudioProcessingError(Exception):
    pass


def preprocess_audio(audio_bytes: bytes):
    try:
        waveform, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050)
    except Exception:
        raise AudioProcessingError("Invalid or corrupted MP3 audio")

    if waveform.size == 0:
        raise AudioProcessingError("Empty audio file")

    mfcc = librosa.feature.mfcc(
        y=waveform,
        sr=sr,
        n_mfcc=84
    )

    if mfcc.shape[1] < 94:
        mfcc = np.pad(mfcc, ((0, 0), (0, 94 - mfcc.shape[1])))
    else:
        mfcc = mfcc[:, :94]

    mfcc = (mfcc - np.mean(mfcc)) / np.std(mfcc)

    mfcc = mfcc[..., np.newaxis]
    mfcc = np.expand_dims(mfcc, axis=0)

    return mfcc


def detect(audio_base64: str):
    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception:
        raise AudioProcessingError("Invalid Base64 encoding")

    model_input = preprocess_audio(audio_bytes)

    prediction = float(model.predict(model_input)[0][0])

    prediction = float(model.predict(model_input)[0][0])  # P(HUMAN)

    if prediction > 0.70:
        return (
         "HUMAN", round(prediction, 2), "Natural prosody and pitch variation detected." 
        )

    elif prediction < 0.40:
        return (
        "AI GENERATED", round(1 - prediction, 2), "Synthetic spectral patterns detected."
        )

    else:
        return (
        "UNCERTAIN", round(abs(prediction - 0.5) * 2, 2), "Both human-like and synthetic acoustic features detected." 
        )

