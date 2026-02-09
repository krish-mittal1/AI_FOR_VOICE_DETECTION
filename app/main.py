from fastapi import FastAPI, Depends , UploadFile , File , Form
import base64
from fastapi.responses import JSONResponse
from app.schemas import Input, SuccessResponse, ErrorResponse
from app.auth import verify_api_key
from app.detector import detect, AudioProcessingError
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://helpful-croissant-b0692f.netlify.app/"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ALLOWED_LANGUAGES = {
    "English",
    "Hindi",
    "Tamil",
    "Telugu",
    "Malayalam"
}

@app.get("/")
def health():
    return {
        "status": "ok"
        }


@app.post("/api/voice-detection/upload")
async def detect_voice_from_file(
    file: UploadFile = File(...),
    language: str = Form(...),
):
    
    if language not in ALLOWED_LANGUAGES:
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "message": "Unsupported language"
            }
        )

    try:
        audio_bytes = await file.read()
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        classification, confidence, explanation = detect(audio_base64)

        return {
            "status": "success",
            "language": language,
            "classification": classification,
            "confidenceScore": confidence,
            "explanation": explanation
        }

    except AudioProcessingError as e:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": str(e)}
        )

    except Exception:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Internal server error"}
        )



@app.post(
    "/api/voice-detection",
    response_model=SuccessResponse,
    responses={400: {"model": ErrorResponse}},
)
def detect_voice(payload: Input, _: str = Depends(verify_api_key)):
    try:
        classification, confidence, explanation = detect(payload.audioBase64)

        return {
            "status": "success",
            "language": payload.language,
            "classification": classification,
            "confidenceScore": confidence,
            "explanation": explanation,
        }

    except AudioProcessingError as e:
        return JSONResponse(
            status_code=400, content={"status": "error", "message": str(e)}
        )

    except Exception:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Internal server error"},
        )
