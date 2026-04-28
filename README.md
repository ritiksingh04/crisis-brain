<<<<<<< HEAD
# crisis-brain
=======
# CrisisBrain — Complete Setup Guide

## Project Structure

```
crisisbrain/
├── src/
│   ├── App.jsx                   Root: routing, nav, auth state
│   ├── index.js / index.css
│   ├── pages/
│   │   ├── SOSPage.jsx           Customer SOS form (no login needed)
│   │   ├── LoginPage.jsx         Staff login
│   │   ├── Dashboard.jsx         Command center
│   │   └── AmbulancePage.jsx     Ambulance team view
│   ├── components/
│   │   ├── MapView.jsx           Google Maps + SVG fallback
│   │   ├── Toast.jsx
│   │   └── Spinner.jsx
│   ├── hooks/useFirebase.js      Single-subscription hooks (no flooding)
│   ├── services/
│   │   ├── firebase.js           Firebase services
│   │   └── api.js                Backend calls with 4s timeout + fallback
│   └── utils/helpers.js
├── backend/
│   ├── main.py                   FastAPI: /triage /dispatch /vision /geocode /health
│   ├── requirements.txt
│   └── Dockerfile
├── scripts/
│   ├── seed_firestore.js         One-time Firestore seed
│   └── test_backend.sh           Backend smoke tests
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── package.json
└── .env
```

---

## Quick Start (5 minutes)

### 1 — Frontend (works instantly, no backend needed)

```bash
npm install
npm start
# Opens http://localhost:3000
```

### 2 — Backend (optional, enables Vision AI + real routing)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080

# Test it:
bash ../scripts/test_backend.sh
```

The proxy in package.json routes /triage, /dispatch etc. automatically.

---

## Demo Login Credentials

| Role       | Email                         | Password     |
|------------|-------------------------------|--------------|
| Dispatcher | dispatcher@crisisbrain.ai     | dispatch123  |
| Admin      | admin@crisisbrain.ai          | admin123     |
| Ambulance  | amb1@crisisbrain.ai           | amb123       |

Work even when Firebase is offline.

---

## Bugs Fixed

### 1. /triage failing (red in Network tab, UI stuck on ANALYZING)
fetch() had no timeout. When backend is not running, the request hung forever.

Fix: Hard 4-second AbortSignal timeout on every request. If it fires, local
keyword scoring runs instantly. The UI can never hang.

### 2. Firestore channel flooding (40+ channel requests in Network tab)
onSnapshot() was called without cleanup, creating a new listener on every
render cycle.

Fix: Global _casesUnsub ref. Before subscribing, always unsubscribe the
previous listener. useEffect with empty [] deps subscribes exactly once.

---

## Deploy to Production

### Backend to Cloud Run

```bash
cd backend
gcloud run deploy crisisbrain-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

Copy the URL into frontend .env:
```
REACT_APP_BACKEND_URL=https://crisisbrain-api-xxxx-uc.a.run.app
```

### Frontend to Firebase Hosting

```bash
npm run build
npx firebase-tools deploy --only hosting
```

---

## Firebase Console Setup

1. firebase.google.com -> project crisibrain
2. Authentication -> Enable Email/Password
3. Add users: dispatcher@crisisbrain.ai/dispatch123, admin@crisisbrain.ai/admin123
4. Firestore -> Create database (asia-south1)
5. Seed: node scripts/seed_firestore.js (needs service-account.json)

---

## Fallback Chain

| Layer       | Primary               | Fallback                    |
|-------------|-----------------------|-----------------------------|
| AI triage   | Backend /triage (4s)  | Local keyword NLP (instant) |
| Image AI    | Google Vision API     | Skipped gracefully          |
| Dispatch    | Distance Matrix API   | Straight-line distance      |
| Map         | Google Maps JS        | SVG grid map                |
| Database    | Firestore real-time   | localStorage + sync queue   |
| Auth        | Firebase Auth         | Demo credentials            |
| Internet    | Online                | Offline queue -> sync later |
>>>>>>> d865de3 (initial commit)
