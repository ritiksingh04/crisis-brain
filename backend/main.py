"""
CrisisBrain Backend — FastAPI v3.1
Run: uvicorn main:app --reload --port 8080
Deploy: gcloud run deploy crisisbrain-api --source . --allow-unauthenticated
"""
import os, math, time
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from datetime import datetime
from firebase.firebase_config import db

app = FastAPI(title="CrisisBrain API", version="3.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MAPS_KEY = os.getenv("MAPS_KEY", "AIzaSyAudspkLbSUoFQsm8rAm6toV2BHEL-fBwk")
VISION_EMAIL = "vision-api-service@crisisbrain.iam.gserviceaccount.com"
VISION_KEY   = os.getenv("VISION_PRIVATE_KEY", """-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDuX8jzeBnmUfIh
uc+i+JpSEBcRm54ULXXGIrGu26MtSH4FNxIaLveAr7AmBZUyEWm0hhvoxPYUkUUd
/uzQ6riokXaL/mCsHijeuHAmyEcBYaRxWaf56hB5dp1oBTs7ZCGhUq45CwVXgACH
dGDYglGLHVFqbCnkFBZw0aEOkMad0VeQvN1N8KTWdne6BpfvoftL3QphhNchHoRx
LruCV6xCsVXQfcHJ6GsZxLmO8g9GFU79GFuVKkukFbSJi9OuQigr1UMDfgGOvRk4
yKnghXhD7L17c6neQKZNdaJfpERMIJKo3u40tr25msMTWNIRf+jU4X0SlTaUwqll
nV21PsENAgMBAAECggEABUYlQg3ENO5XNxvPVkG92Fb2y7Lvum6PDoUx/TZq09Oo
xiDDy8SCQVyhvxWciXENL6tP7sR81VOpfdJoFu86irA9OTe1l9lK+jKGeLUxrPwm
EUP0jXj6SFWxgd2rw9KhU9pqdGSkB52TZWvTwLaRa0yIwpwGCT/Qh0p8D8BwRImU
QfrlAzFXaReBa7+Fa8/2T1k3hOfjIC8NBztxHe7PlwsDyzEhHk6YphPdEr7ZlKnz
OREqn/vpbWW5XxUk/ubGcqGeOQo+pITyslDxQxPXlru4jmnxvsoGcWkHf12MN3jR
ynUFjdNTxt4Rj80JXOH+btvvgH10puj96Gr1+w8QGQKBgQD4MKNgJ40fkxbfi3bQ
HOkhpZ9O9ihcVdYPN/fkzDV2r53sUmvt7N0XfoFkFUuorjHjkd9XDdw5suoUu483
vOff67bgaBrr4u7EYReiVwBWP0Ay9TWUU2++/Vb0mvGob+dqR5ohQz60mS41Z0Rs
6LnEAyZv6Iv6U0hR6XAGz9zkjwKBgQD14BKay5Qkb7PlSkpdqBr9yaKRBnp85nDZ
ztjZ//HrGHEwmzbZQm9wcSc8TBz8ZR/R/guFj69HB5DURk3PInl4YJeztF/2do9D
q54JTJdgan1ZxbZ23orFg8QfwEaiCTzRpOvRB+lzusHtvUau+N2RxxKOrZMY4X8k
CUPeIZQmowKBgQC6skPDqhzjmo8DO/L1XDoW4HK1QEBeLQeoTQ7B4sd472RZiCq+
QIaUDMqikc5nJhpLOMkLwFZgZPDnBawXXpgCflsD9ewCc6Puv6a6rL2JI21Up9ZV
LGqL/iCyQff1H7Cx5wjPark5u1ziOTtkvbA3/bKlTgY2GP32+CYYSba9iwKBgQCs
SSCAOxpJFcR2bEIDsmGHZ5x0BpgZoNd+p4Qn7UI0u+HEb15ViknP/lnB1IuTB8Du
QhcMtYvaN6DyPXkUJVH8WaKzFzcO2jC0+DI6zeJcewHuv62FSZbvo87veKmFrPdi
5y8eP28D2t88mR5ISLXpChckxteF3axbMerOYbUQBQKBgCaP6FZiBTcT35K1NqCz
bA3q90tbpxv1B4KUW1DHitW6oDsDO7e+Xh6+581G1v5xl79m7nL5XNJOvGkYirlN
v/tVoc5zXw2p2E55hABbq41pRCdYiObg9KGHAcRTs+O1gD3T3PrEIVKZ4uKa/dWb
OHIhfhV0/1Ru7Rj4FGT1pmHV
-----END PRIVATE KEY-----""")
TOKEN_URI = "https://oauth2.googleapis.com/token"
_tok: dict = {"v": None, "exp": 0}

class TriageReq(BaseModel):
    case_id: str
    description: str
    severity: str
    image_base64: str = ""
    lat: float
    lng: float

# Incident model for simple incident creation
class Incident(BaseModel):
    description: str
    lat: float
    lng: float

class DispatchReq(BaseModel):
    case_id: str
    case_lat: float
    case_lng: float

@app.get("/")
@app.get("/health")
async def health():
    return {"status": "ok", "ts": datetime.utcnow().isoformat(), "maps": bool(MAPS_KEY)}

async def get_vision_token():
    if _tok["v"] and time.time() < _tok["exp"] - 60:
        return _tok["v"]
    try:
        import jwt as pyjwt
        iat = int(time.time())
        pl  = {"iss": VISION_EMAIL, "sub": VISION_EMAIL, "aud": TOKEN_URI,
               "iat": iat, "exp": iat+3600, "scope": "https://www.googleapis.com/auth/cloud-vision"}
        ast = pyjwt.encode(pl, VISION_KEY, algorithm="RS256")
        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.post(TOKEN_URI, data={"grant_type":"urn:ietf:params:oauth:grant-type:jwt-bearer","assertion":ast})
            r.raise_for_status(); d = r.json()
        _tok["v"] = d["access_token"]; _tok["exp"] = time.time() + d.get("expires_in",3600)
        return _tok["v"]
    except Exception as e:
        raise RuntimeError(str(e))

def _local_nlp(text, severity):
    t=text.lower(); bonus=0; kw=[]
    for w,p in [("unconscious",12),("cardiac arrest",14),("not breathing",14),("no pulse",13),("drowning",12),("trapped",10),("fire",10),("explosion",12),("bleeding heavily",12),("multiple victims",11),("stroke",11),("seizure",11),("stabbed",12),("collapsed",10)]:
        if w in t: bonus+=p; kw.append(w)
    for w,p in [("fracture",7),("head injury",8),("chest pain",8),("severe",6),("hit by",7),("child",6),("burn",7)]:
        if w in t: bonus+=p; kw.append(w)
    base={"critical":75,"high":55,"medium":35}.get(severity,40)
    sc=min(99,max(10,base+bonus))
    sv="critical" if sc>=80 else ("high" if sc>=55 else "medium")
    PF={"critical":"CRITICAL — Immediate life threat.","high":"HIGH — Urgent response needed.","medium":"MEDIUM — Prompt response required."}
    return sc,sv,kw[:5],f"{PF[sv]} Indicators: {', '.join(kw[:3]) or 'general emergency'}."

@app.post("/triage")
async def triage(req: TriageReq):
    vis_labels=[]; vis_bonus=0; sources=[]
    if req.image_base64:
        try:
            tok=await get_vision_token()
            async with httpx.AsyncClient(timeout=7) as c:
                r=await c.post("https://vision.googleapis.com/v1/images:annotate",
                    json={"requests":[{"image":{"content":req.image_base64},"features":[{"type":"LABEL_DETECTION","maxResults":12}]}]},
                    headers={"Authorization":f"Bearer {tok}"})
                r.raise_for_status()
            labels=[l["description"].lower() for l in r.json()["responses"][0].get("labelAnnotations",[])]
            vis_labels=labels[:8]
            INJS={"blood","wound","injury","accident","fire","explosion","smoke","unconscious","fracture","burn"}
            vis_bonus=min(25,sum(8 for l in labels if any(iw in l for iw in INJS)))
            sources.append("vision")
        except Exception as e:
            print(f"[Vision] {e}")
    sc,sv,kw,assess=_local_nlp(req.description,req.severity)
    sources.append("local_nlp")
    base={"critical":75,"high":55,"medium":35}.get(req.severity,40)
    final=min(99,max(10,int(base+(sc-base)*0.6+vis_bonus*0.4)))

    sv="critical" if final>=80 else ("high" if final>=55 else "medium")

    # Update case with triage summary
    try:
        db.collection("cases").document(req.case_id).update({
            "priority_score": final,
            "severity": sv,
            "victim": {
                "ai_assessment": assess
            },
            "keywords": kw,
            "status": "triaged"
        })
    except Exception as e:
        print(f"[Firestore triage update] {e}")

    vis_n=f" Visual: {', '.join(vis_labels[:3])}." if vis_labels else ""

    result = {
        "score": final,
        "severity": sv,
        "ai_assessment": assess + vis_n,
        "keywords": kw,
        "vision_labels": vis_labels,
        "source": "+".join(sources)
    }

    # Save to Firestore — update the existing case instead of creating a new doc
    try:
        db.collection("cases").document(req.case_id).update({
            "description": req.description,
            "input_severity": req.severity,
            "priority_score": final,
            "final_score": final,
            "final_severity": sv,
            "ai_assessment": assess + vis_n,
            "keywords": kw,
            "vision_labels": vis_labels,
            "lat": req.lat,
            "lng": req.lng,
            "status": "triaged",
            "triaged_at": datetime.utcnow().isoformat()
        })
    except Exception as e:
        print(f"[Firestore save] {e}")

    result["case_id"] = req.case_id

    return result

@app.post("/dispatch")
async def dispatch(req: DispatchReq):
    # Load available ambulances from Firestore instead of receiving them in the request
    try:
        docs = db.collection("ambulances").where("busy", "==", False).get()
        avail = []
        for d in docs:
            a = d.to_dict() or {}
            a["id"] = d.id
            avail.append(a)
    except Exception as e:
        print(f"[Firestore ambulances] {e}")
        return {"ok": False, "error": "ambulance_lookup_failed"}

    if not avail:
        return {"ok": False, "error": "no_ambulances_available"}

    # Try distance matrix + directions if MAPS_KEY available
    if MAPS_KEY:
        try:
            origins = "|".join(f"{a['lat']},{a['lng']}" for a in avail)
            async with httpx.AsyncClient(timeout=6) as c:
                r = await c.get(
                    f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origins}&destinations={req.case_lat},{req.case_lng}&mode=driving&key={MAPS_KEY}"
                )
                r.raise_for_status()
            bi, bt = 0, float("inf")
            for i, row in enumerate(r.json().get("rows", [])):
                el = row["elements"][0]
                if el.get("status") == "OK" and el["duration"]["value"] < bt:
                    bt = el["duration"]["value"]
                    bi = i
            best = avail[bi]
            route = None
            try:
                async with httpx.AsyncClient(timeout=6) as c:
                    dr = await c.get(
                        f"https://maps.googleapis.com/maps/api/directions/json?origin={best['lat']},{best['lng']}&destination={req.case_lat},{req.case_lng}&mode=driving&key={MAPS_KEY}"
                    )
                    dr.raise_for_status()
                    routes = dr.json().get("routes", [])
                if routes:
                    leg = routes[0]["legs"][0]
                    route = {
                        "polyline": routes[0]["overview_polyline"]["points"],
                        "distance": leg["distance"]["text"],
                        "duration": leg["duration"]["text"],
                    }
            except Exception:
                pass

            # Record dispatch assignment in Firestore
            best_amb = best
            eta_sec = bt if bt is not None else None
            eta_text = f"{math.ceil(bt/60)} min" if bt is not None else None
            try:
                print("Updating case:", req.case_id)
                db.collection("cases").document(req.case_id).update({
                    "dispatch": {
                        "ambulance_id": best_amb["id"],
                        "eta": eta_sec,
                        "assigned_at": datetime.utcnow().isoformat()
                    },
                    "status": "dispatched"
                })
                print("Case updated successfully")
            except Exception as e:
                print(f"[Firestore dispatch update] {e}")

            return {"ok": True, "amb_id": best["id"], "eta_sec": bt, "eta_text": eta_text, "route": route, "source": "distance_matrix"}
        except Exception as e:
            print(f"[Dispatch] {e}")

    # Fallback — choose nearest by Euclidean distance
    best = min(avail, key=lambda a: math.hypot((a["lat"] - req.case_lat) * 111, (a["lng"] - req.case_lng) * 111))
    d = math.hypot((best["lat"] - req.case_lat) * 111, (best["lng"] - req.case_lng) * 111)
    eta = max(3, round(d / 0.45))
    best_amb = best
    eta_sec = eta * 60
    eta_text = f"~{eta} min (est.)"
    try:
        print("Updating case:", req.case_id)
        db.collection("cases").document(req.case_id).update({
            "dispatch": {
                "ambulance_id": best_amb["id"],
                "eta": eta_sec,
                "assigned_at": datetime.utcnow().isoformat()
            },
            "status": "dispatched"
        })
        print("Case updated successfully")
    except Exception as e:
        print(f"[Firestore dispatch update] {e}")

    return {"ok": True, "amb_id": best["id"], "eta_sec": eta_sec, "eta_text": eta_text, "route": None, "source": "euclidean_fallback"}
@app.get("/case/{case_id}")
def get_case(case_id: str):
    doc = db.collection("cases").document(case_id).get()
    if not doc.exists:
        return {"error": "Case not found"}
    return doc.to_dict()

@app.post("/incident")
def create_incident(incident: Incident):
    case_ref = db.collection("cases").document()

    data = {
        "created_at": datetime.utcnow().isoformat(),
        "status": "reported",
        "description": incident.description,
        "location": {
            "lat": incident.lat,
            "lng": incident.lng
        }
    }

    case_ref.set(data)

    print("Saved case:", case_ref.id)
    print("Firestore project:", db.project)

    return {
        "success": True,
        "case_id": case_ref.id
    }
@app.get("/debug")
def debug():
    docs = db.collection("cases").stream()

    result = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        result.append(item)

    return result
@app.get("/dbinfo")
def dbinfo():
    return {
        "project": db.project,
        "database": db._database_string
    }       
