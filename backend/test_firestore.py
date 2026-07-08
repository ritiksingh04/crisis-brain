from firebase.firebase_config import db
from datetime import datetime

@app.post("/incident")
def create_incident(incident: Incident):

    data = {
        "description": incident.description,
        "lat": incident.lat,
        "lng": incident.lng,
        "created_at": datetime.utcnow().isoformat()
    }

    doc = db.collection("incidents").add(data)

    return {
        "success": True,
        "id": doc[1].id
    }