from fastapi import Header , HTTPException
from typing import Optional
import os
from dotenv import load_dotenv
load_dotenv()

API_KEY = os.getenv("API_KEY")

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401 , detail={
            "status" : "error",
            "message": "Invalid API key"
        })