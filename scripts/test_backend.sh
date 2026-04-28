#!/bin/bash
# ─── CrisisBrain Backend Smoke Tests ─────────────────────────────────────────
# Usage: bash scripts/test_backend.sh [base_url]
# Default base_url: http://localhost:8080

BASE=${1:-http://localhost:8080}
PASS=0; FAIL=0

check() {
  local name="$1" url="$2" method="$3" body="$4" expect="$5"
  if [ "$method" = "POST" ]; then
    result=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$body" --max-time 10)
  else
    result=$(curl -s "$url" --max-time 10)
  fi
  if echo "$result" | grep -q "$expect"; then
    echo "  ✓ $name"
    PASS=$((PASS+1))
  else
    echo "  ✗ $name — got: $result"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "CrisisBrain Backend Tests → $BASE"
echo "─────────────────────────────────"

check "Health check"          "$BASE/health"    "GET"  ""  "ok"
check "Triage (local NLP)"    "$BASE/triage"    "POST" '{"description":"cardiac arrest patient not breathing","severity":"critical"}' "score"
check "Triage (medium)"       "$BASE/triage"    "POST" '{"description":"minor cut on hand","severity":"medium"}'   "score"
check "Dispatch (fallback)"   "$BASE/dispatch"  "POST" '{"case_id":"TEST","case_lat":28.64,"case_lng":77.35,"ambulances":[{"id":"AMB-1","lat":28.65,"lng":77.36,"busy":false},{"id":"AMB-2","lat":28.60,"lng":77.31,"busy":false}]}' "amb_id"
check "Geocode"               "$BASE/geocode?address=Connaught+Place+New+Delhi" "GET" "" "lat"

echo "─────────────────────────────────"
echo "  Passed: $PASS  Failed: $FAIL"
echo ""
