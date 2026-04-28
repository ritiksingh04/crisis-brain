#!/bin/bash
# CrisisBrain — one-command start
# Usage: bash start.sh
set -e

ROOT=$(cd "$(dirname "$0")" && pwd)
echo ""
echo "  ██████╗██████╗ ██╗███████╗██╗███████╗██████╗ ██████╗  █████╗ ██╗███╗   ██╗"
echo "  ██╔════╝██╔══██╗██║██╔════╝██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║"
echo "  ██║     ██████╔╝██║███████╗██║███████╗██████╔╝██████╔╝███████║██║██╔██╗ ██║"
echo "  ██║     ██╔══██╗██║╚════██║██║╚════██║██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║"
echo "  ╚██████╗██║  ██║██║███████║██║███████║██████╔╝██║  ██║██║  ██║██║██║ ╚████║"
echo "   ╚═════╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝"
echo ""

# ── Backend ───────────────────────────────────────────────────────────────────
echo "▶ Starting backend (FastAPI on :8080)..."
cd "$ROOT/backend"
pip install -r requirements.txt -q 2>&1 | tail -2
uvicorn main:app --host 0.0.0.0 --port 8080 --reload --log-level warning &
BACKEND_PID=$!

# Wait and health-check
sleep 2
if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
  echo "  ✓ Backend online → http://localhost:8080"
else
  echo "  ⚠ Backend not responding — frontend will use local fallback mode"
fi

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "▶ Starting frontend (React on :3000)..."
cd "$ROOT"
if [ ! -d node_modules ]; then
  echo "  Installing npm packages..."
  npm install -q
fi

export REACT_APP_BACKEND_URL=http://localhost:8080
npm start

# Cleanup
trap "echo 'Shutting down...'; kill $BACKEND_PID 2>/dev/null" EXIT
