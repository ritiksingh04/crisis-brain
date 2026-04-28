import { useState, useEffect, useRef, useCallback } from 'react';
import { CaseService, AmbService, testFirebase } from '../services/firebase';

// ─── useFirebaseInit — call once at app root ──────────────────────────────────
export function useFirebaseInit() {
  const [ready, setReady]   = useState(false);
  const [fbOK,  setFbOK]    = useState(false);

  useEffect(() => {
    testFirebase().then(ok => { setFbOK(ok); setReady(true); });
  }, []);

  return { ready, fbOK };
}

// ─── useCases — single listener, stable reference ────────────────────────────
const SEED_CASES = [
  { id:'CB-D1', title:'Multi-vehicle collision NH-58',     loc:'NH-58 Industrial Area',      sev:'critical', score:97, status:'pending', amb:null, eta:null, lat:28.6218, lng:77.380, mapX:128, mapY:172, ai:'Severe head trauma. 3+ unconscious.',          kw:['unconscious','multiple victims'],  vision:[], time:new Date(Date.now()-300000).toISOString() },
  { id:'CB-D2', title:'Cardiac arrest — male 62y',         loc:'Sector 14, Vasundhara',      sev:'critical', score:94, status:'pending', amb:null, eta:null, lat:28.6450, lng:77.360, mapX:238, mapY:125, ai:'No pulse. CPR in progress.',                   kw:['cardiac arrest','no pulse'],       vision:[], time:new Date(Date.now()-240000).toISOString() },
  { id:'CB-D3', title:'Structure fire — trapped workers',  loc:'Industrial Zone NH-58',      sev:'critical', score:91, status:'pending', amb:null, eta:null, lat:28.6100, lng:77.370, mapX:86,  mapY:250, ai:'Explosion. Multiple trapped. HAZMAT needed.',  kw:['fire','trapped','explosion'],      vision:[], time:new Date(Date.now()-180000).toISOString() },
  { id:'CB-D4', title:'Pedestrian hit by bus',             loc:'Raj Nagar Chowk',            sev:'high',     score:78, status:'pending', amb:null, eta:null, lat:28.6600, lng:77.420, mapX:392, mapY:190, ai:'Femur fracture likely. Conscious.',             kw:['fracture','bleeding'],             vision:[], time:new Date(Date.now()-120000).toISOString() },
  { id:'CB-D5', title:'Child — fall from 3rd floor',       loc:'Indirapuram Heights',        sev:'high',     score:72, status:'pending', amb:null, eta:null, lat:28.6700, lng:77.380, mapX:472, mapY:90,  ai:'6yr, 3m fall. Head + arm injury suspected.',   kw:['child','fall','head injury'],      vision:[], time:new Date(Date.now()-90000).toISOString() },
  { id:'CB-D6', title:'Severe allergic reaction',          loc:'Crossings Republik Mall',    sev:'medium',   score:55, status:'pending', amb:null, eta:null, lat:28.6350, lng:77.410, mapX:292, mapY:290, ai:'Facial swelling post-nut exposure.',            kw:['anaphylaxis'],                     vision:[], time:new Date(Date.now()-60000).toISOString() },
  { id:'CB-D7', title:'Elderly slip & fall',               loc:'Vaishali Sector 2',          sev:'medium',   score:44, status:'pending', amb:null, eta:null, lat:28.6420, lng:77.335, mapX:172, mapY:318, ai:'78F, bathroom fall. Hip pain. Conscious.',      kw:['elderly','fall'],                  vision:[], time:new Date(Date.now()-30000).toISOString() },
];

export function useCases() {
  const [cases,     setCases]   = useState(SEED_CASES);
  const seedMerged              = useRef(false);
  const unsubRef                = useRef(null);

  useEffect(() => {
    // unsubscribe previous listener before creating new one
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    unsubRef.current = CaseService.subscribe(live => {
      setCases(prev => {
        if (!seedMerged.current && live.length > 0) {
          seedMerged.current = true;
          return live; // firebase has real data, use it
        }
        if (live.length === 0) return prev; // keep seeds if empty
        const liveIds = new Set(live.map(c => c.id));
        const seeds   = SEED_CASES.filter(c => !liveIds.has(c.id));
        return [...live, ...seeds].sort((a, b) => b.score - a.score);
      });
    });

    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, []); // ← empty deps: subscribe ONCE

  const updateCase = useCallback((id, patch) => {
    setCases(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
    CaseService.update(id, patch);
  }, []);

  const removeCase = useCallback((id) => {
    setCases(cs => cs.filter(c => c.id !== id));
  }, []);

  const addCase = useCallback((c) => {
    setCases(cs => [c, ...cs].sort((a, b) => b.score - a.score));
  }, []);

  return { cases, updateCase, removeCase, addCase };
}

// ─── useAmbulances ────────────────────────────────────────────────────────────
const SEED_AMBS = [
  { id:'AMB-1', team:'Alpha', lat:28.6500, lng:77.3550, mapX:218, mapY:105, busy:false, assignedCase:null },
  { id:'AMB-2', team:'Beta',  lat:28.6050, lng:77.3100, mapX:55,  mapY:76,  busy:false, assignedCase:null },
  { id:'AMB-3', team:'Gamma', lat:28.6150, lng:77.3650, mapX:98,  mapY:145, busy:false, assignedCase:null },
  { id:'AMB-4', team:'Delta', lat:28.6750, lng:77.4800, mapX:572, mapY:270, busy:false, assignedCase:null },
];

export function useAmbulances() {
  const [ambs,    setAmbs]  = useState(SEED_AMBS);
  const unsubRef            = useRef(null);

  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    unsubRef.current = AmbService.subscribe(a => setAmbs(a.length ? a : SEED_AMBS));
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, []);

  const updateAmb = useCallback((id, patch) => {
    setAmbs(as => as.map(a => a.id === id ? { ...a, ...patch } : a));
    AmbService.update(id, patch);
  }, []);

  return { ambs, updateAmb };
}

// ─── useOnlineStatus ─────────────────────────────────────────────────────────
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
