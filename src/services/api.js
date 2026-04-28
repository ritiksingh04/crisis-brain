// ─── API Service — timeout + immediate local fallback, never hangs ────────────

export const MAPS_KEY = 'AIzaSyAudspkLbSUoFQsm8rAm6toV2BHEL-fBwk';
const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

// ─── fetch with hard timeout ──────────────────────────────────────────────────
async function fetchWithTimeout(url, opts = {}, ms = 4000) {
  const ctrl = new AbortController();
  const id    = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(id);
    return r;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ─── LOCAL KEYWORD SCORER — runs instantly, no network ───────────────────────
function localScore(text = '', severity = 'medium') {
  const t   = text.toLowerCase();
  const CRIT = [['unconscious',12],['cardiac arrest',14],['not breathing',14],['no pulse',13],
                ['drowning',12],['trapped',10],['fire',10],['explosion',12],['bleeding heavily',12],
                ['multiple victims',11],['stroke',11],['seizure',11],['stabbed',12],['collapsed',10]];
  const HIGH = [['fracture',7],['head injury',8],['chest pain',8],['severe',6],
                ['hit by',7],['child',6],['burn',7],['fall from',7]];
  const MED  = ['minor','scratch','sprain','nausea','dizzy','bruise'];
  let bonus = 0; const kw = [];
  CRIT.forEach(([w,p]) => { if (t.includes(w)) { bonus += p; kw.push(w); }});
  HIGH.forEach(([w,p]) => { if (t.includes(w)) { bonus += p; kw.push(w); }});
  MED.forEach(w => { if (t.includes(w)) bonus -= 3; });
  const base  = {critical:75,high:55,medium:35}[severity] || 40;
  const score = Math.min(99, Math.max(10, base + bonus));
  const sev   = score >= 80 ? 'critical' : score >= 55 ? 'high' : 'medium';
  const PFX   = {critical:'CRITICAL — Immediate life threat.',high:'HIGH — Urgent response needed.',medium:'MEDIUM — Prompt response required.'};
  return {
    score, severity: sev,
    ai_assessment: `${PFX[sev]} Indicators: ${kw.slice(0,3).join(', ')||'general emergency'}. [Local NLP engine]`,
    keywords: kw.slice(0,5), vision_labels: [], source: 'local'
  };
}

// ─── STRAIGHT-LINE DISPATCH ───────────────────────────────────────────────────
function nearestAmbulance(ambulances, lat, lng) {
  const avail = ambulances.filter(a => !a.busy);
  if (!avail.length) return null;
  return avail.reduce((best, a) => {
    const d = Math.hypot((a.lat - lat) * 111, (a.lng - lng) * 111);
    return (!best || d < best._d) ? { ...a, _d: d } : best;
  }, null);
}

// ─── TRIAGE — backend → local fallback ───────────────────────────────────────
export async function triageCase({ description, severity, imageBase64, lat, lng }) {
  if (BACKEND) {
    try {
      const r = await fetchWithTimeout(`${BACKEND}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, severity, image_base64: imageBase64, lat, lng })
      }, 4000);  // ← 4 s hard timeout, never hangs UI
      if (r.ok) {
        const data = await r.json();
        return { ...data, source: data.source || 'backend' };
      }
    } catch (e) {
      console.warn('[Triage] backend unreachable, using local:', e.message);
    }
  }
  // Instant local fallback — guaranteed result, 0 ms wait
  return localScore(description, severity);
}

// ─── DISPATCH — Distance Matrix → straight-line fallback ─────────────────────
export async function dispatchAmbulance({ caseId, caseLat, caseLng, ambulances }) {
  const avail = ambulances.filter(a => !a.busy);
  if (!avail.length) return { ok: false, error: 'No ambulances available' };

  // Try Distance Matrix API
  try {
    const origins = avail.map(a => `${a.lat},${a.lng}`).join('|');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${caseLat},${caseLng}&mode=driving&key=${MAPS_KEY}`;
    const r = await fetchWithTimeout(url, {}, 5000);
    if (r.ok) {
      const data  = await r.json();
      let bestIdx = 0, bestTime = Infinity;
      data.rows?.forEach((row, i) => {
        const el = row.elements?.[0];
        if (el?.status === 'OK' && el.duration.value < bestTime) {
          bestTime = el.duration.value; bestIdx = i;
        }
      });
      const best = avail[bestIdx];
      // Get route
      let route = null;
      try {
        const dr = await fetchWithTimeout(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${best.lat},${best.lng}&destination=${caseLat},${caseLng}&mode=driving&key=${MAPS_KEY}`, {}, 5000
        );
        if (dr.ok) {
          const dd = await dr.json();
          const leg = dd.routes?.[0]?.legs?.[0];
          if (leg) route = { polyline: dd.routes[0].overview_polyline?.points, distance: leg.distance?.text, duration: leg.duration?.text };
        }
      } catch {}
      return { ok:true, amb_id:best.id, eta_text:`${Math.ceil(bestTime/60)} min`, route, source:'distance_matrix' };
    }
  } catch (e) { console.warn('[Dispatch] Maps API failed, using fallback:', e.message); }

  // Straight-line fallback
  const best = nearestAmbulance(ambulances, caseLat, caseLng);
  if (!best) return { ok: false, error: 'No ambulances available' };
  const dist   = Math.hypot((best.lat - caseLat) * 111, (best.lng - caseLng) * 111);
  const etaMin = Math.max(3, Math.round(dist / 0.45));
  return { ok:true, amb_id:best.id, eta_text:`~${etaMin} min (est.)`, route:null, source:'local_fallback' };
}

// ─── VISION via backend — skip gracefully if unavailable ─────────────────────
export async function analyzeImage(imageBase64) {
  if (!BACKEND) return { labels: [], bonus: 0 };
  try {
    const r = await fetchWithTimeout(`${BACKEND}/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 })
    }, 5000);
    if (r.ok) return await r.json();
  } catch {}
  return { labels: [], bonus: 0 };
}
