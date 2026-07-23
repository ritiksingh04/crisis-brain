from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from google.cloud import firestore
from datetime import datetime

router = APIRouter()
db = firestore.Client()


class IncidentRequest(BaseModel):
    case_id: str
    description: str
    severity: str
    score: int
    ai_assessment: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    image_base64: Optional[str] = None


@router.post("/incident")
async def create_incident(req: IncidentRequest):
    try:
        doc_ref = db.collection("cases").document(req.case_id)

        data = {
            "case_id": req.case_id,
            "description": req.description,
            "severity": req.severity,
            "score": req.score,
            "ai_assessment": req.ai_assessment,
            "lat": req.lat,
            "lng": req.lng,
            "status": "pending",
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }

        # Creates the document if missing, updates it if it already exists.
        doc_ref.set(data, merge=True)

        return {
            "success": True,
            "case_id": req.case_id,
            "message": "Incident saved successfully."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))