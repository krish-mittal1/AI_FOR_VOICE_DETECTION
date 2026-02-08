from pydantic import BaseModel , Field
from typing import Literal

class Input(BaseModel):
    language: Literal["Tamil" , "English" , "Hindi" , "Malayalam" ,"Telugu"]
    audioFormat: Literal["mp3"]
    audioBase64: str = Field(..., min_length = 1)

    class Config:
        extra = "forbid"

class SuccessResponse(BaseModel):
    status: Literal["success"]
    language: Literal["Tamil" , "English" , "Hindi" , "Malayalam" , "Telugu"]
    classification: Literal["AI_GENERATED" , "HUMAN"]
    confidenceScore: float = Field(... , ge = 0.0 , le = 1.0)
    explanation: str

    class Config:
        extra = "forbid"

class ErrorResponse(BaseModel):
    status : Literal["error"]
    message: str
    
    class Config:
        extra = "forbid"