from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from app.schemas import Input, SuccessResponse, ErrorResponse
from app.auth import verify_api_key
from app.detector import detect, AudioProcessingError
import uvicorn

app = FastAPI()

@app.get("/")
def health():
    return {
        "status": "ok"
        }

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
