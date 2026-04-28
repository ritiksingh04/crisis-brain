import { useState, useEffect, useRef } from 'react';
import { useCases, useAmbulances } from '../hooks/useFirebase';
import { dispatchAmbulance } from '../services/api';
import { sevColor, sevBg, relTime } from '../utils/helpers';
import { useToast, ToastContainer } from '../components/Toast';
import MapView from '../components/MapView';
import Spinner from '../components/Spinner';

const SIM_CASES = [
  { title:'Drowning — Hindon River',    sev:'critical', score:89, kw:['drowning','unconscious'], lat:28.690, lng:77.320, mapX:180, mapY:58 },
  { title:'Electrocution — site',       sev:'high',     score:73, kw:['electrocution'],          lat:28.627, lng:77.362, mapX:308, mapY:218 },
  { title:'Snake bite — GT Road',       sev:'high',     score:66, kw:['snake bite'],              lat:28.590, lng:77.410, mapX:418, mapY:338 },
  { title:'Building collapse — Noida',  sev:'critical', score:95, kw:['trapped','collapse'],      lat:28.610, lng:77.390, mapX:260, mapY:200 },
];

export default function Dashboard({ user, onLogout }) {
  const { cases, updateCase, removeCase, addCase } = useCases();
  const { ambs,  updateAmb }                       = useAmbulances();
  const { toasts, add: toast }                     = useToast();

  const [selId,       setSelId]       = useState(null);
  const [filter,      setFilter]      = useState('all');
  const [routePoly,   setRoutePoly]   = useState(null);
  const [callModal,   setCallModal]   = useState(null);
  const [callPhase,   setCallPhase]   = useState(null);
  const [dispatching, setDispatching] = useState(null);
  const [clock,       setClock]       = useState(new Date());
  const simRef = useRef(null);

  // clock tick
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  // simulate new SOS every 40 s (only once)
  useEffect(() => {
    simRef.current = setInterval(() => {
      const s = SIM_CASES[Math.floor(Math.random() * SIM_CASES.length)];
      const nc = {
        id:   'CB-' + Date.now().toString(36).toUpperCase(),
        ...s, loc:'NCR Region', ai:`${s.kw.join(', ')} reported. Awaiting dispatch.`,
        vision:[], status:'pending', amb:null, eta:null,
        time:new Date().toISOString()
      };
      addCase(nc);
      toast('🚨', 'New SOS received', `${nc.title} — Score ${nc.score}`, true);
    }, 40000);
    return () => clearInterval(simRef.current);
  }, [addCase, toast]);

  // ── dispatch ───────────────────────────────────────────────────────────────
  async function handleDispatch(caseId) {
    const c = cases.find(x => x.id === caseId); if (!c) return;
    setDispatching(caseId);
    const res = await dispatchAmbulance({ caseId, caseLat: c.lat||28.6353, caseLng: c.lng||77.39, ambulances: ambs });
    setDispatching(null);
    if (!res.ok) { toast('⚠️', 'No units available', res.error, true); return; }
    const patch = { status:'routed', amb:res.amb_id, eta:res.eta_text };
    updateCase(caseId, patch);
    updateAmb(res.amb_id, { busy:true, assignedCase:caseId });
    if (res.route?.polyline) setRoutePoly(res.route.polyline);
    toast('🚑', `${res.amb_id} dispatched`, `ETA ${res.eta_text} · ${res.source}`, true);
  }

  // ── resolve ────────────────────────────────────────────────────────────────
  async function handleResolve(caseId) {
    const c = cases.find(x => x.id === caseId); if (!c) return;
    updateCase(caseId, { status:'resolved' });
    if (c.amb) updateAmb(c.amb, { busy:false, assignedCase:null });
    setTimeout(() => removeCase(caseId), 800);
    if (selId === caseId) setSelId(null);
    toast('✓', 'Case resolved', caseId, false);
  }

  // ── call coordinator ───────────────────────────────────────────────────────
  async function handleCall(c) {
    setCallModal(c); setCallPhase('connecting');
    // WebRTC call attempt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:false });
      stream.getTracks().forEach(t => t.stop()); // just test mic access
      setCallPhase('mock'); // backend not deployed: show mock
    } catch {
      setCallPhase('mock');
    }
  }

  const sel     = cases.find(c => c.id === selId);
  const shown   = cases.filter(c => {
    if (filter === 'critical') return c.sev  === 'critical';
    if (filter === 'pending')  return c.status === 'pending';
    return true;
  });
  const crit    = cases.filter(c => c.sev === 'critical').length;
  const routed  = cases.filter(c => c.status === 'routed').length;
  const avail   = ambs.filter(a => !a.busy).length;

  return (
    <div style={{ height:'calc(100vh - 58px)', display:'flex', overflow:'hidden', color:'#EFEFEF' }}>
      <ToastContainer toasts={toasts}/>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside style={{ width:210, background:'#111', borderRight:'.5px solid rgba(255,255,255,.1)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'13px 16px 10px', borderBottom:'.5px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#E8281A', animation:'blink 1.3s infinite', display:'inline-block' }}/>
            CRISIS<span style={{ color:'#E8281A' }}>BRAIN</span>
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:'#333', marginTop:2, letterSpacing:1 }}>Firebase + Maps + Vision</div>
        </div>

        <div style={{ padding:'10px 14px 9px', borderBottom:'.5px solid rgba(255,255,255,.06)', display:'flex', gap:9, alignItems:'center' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(232,40,26,.14)', border:'.5px solid rgba(232,40,26,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#E8281A', fontFamily:"'DM Mono',monospace", flexShrink:0 }}>
            {user.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:500 }}>{user.name}</div>
            <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace" }}>{user.role.toUpperCase()}</div>
          </div>
        </div>

        <nav style={{ flex:1, padding:'8px 7px' }}>
          {[['🗺','Live Map',true,crit],['📋','Incidents',false,0],['🚑','Ambulances',false,0],['🧠','AI Log',false,0],['📊','Analytics',false,0]].map(([ic,lb,act,badge])=>(
            <div key={lb} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 9px', borderRadius:7, cursor:'pointer', color:act?'#EFEFEF':'#666', fontSize:12, background:act?'rgba(232,40,26,.09)':'transparent', border:act?'.5px solid rgba(232,40,26,.18)':'.5px solid transparent', marginBottom:2 }}>
              <span style={{ fontSize:12 }}>{ic}</span>{lb}
              {badge>0&&<span style={{ marginLeft:'auto', background:'#E8281A', color:'#fff', fontSize:9, fontFamily:"'DM Mono',monospace", padding:'1px 6px', borderRadius:10 }}>{badge}</span>}
            </div>
          ))}
        </nav>

        <div style={{ padding:'8px 7px', borderTop:'.5px solid rgba(255,255,255,.06)' }}>
          <div style={{ padding:'5px 9px', fontFamily:"'DM Mono',monospace", fontSize:8, color:'#333', lineHeight:1.8, marginBottom:4 }}>
            Firebase: active<br/>Maps API: live<br/>Vision AI: active
          </div>
          <button onClick={onLogout} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'8px 9px', borderRadius:7, cursor:'pointer', color:'#555', fontSize:12, background:'transparent', border:'none', fontFamily:"'DM Sans',sans-serif" }}>
            ↩ Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* TOPBAR */}
        <div style={{ height:48, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', borderBottom:'.5px solid rgba(255,255,255,.1)', background:'#111', flexShrink:0 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#555', letterSpacing:.5 }}>
            COMMAND CENTER · {clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          </div>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            {[['ACTIVE',cases.length,'#EFEFEF'],['CRITICAL',crit,'#E24B4A'],['ROUTED',routed,'#3B82F6'],['FREE AMB',avail,'#22C55E']].map(([l,n,col])=>(
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:col, lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:8, color:'#444', fontFamily:"'DM Mono',monospace", letterSpacing:.5 }}>{l}</div>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:'#22C55E', fontFamily:"'DM Mono',monospace", border:'.5px solid rgba(34,197,94,.3)', padding:'3px 9px', borderRadius:20, background:'rgba(34,197,94,.05)' }}>
              <span style={{ width:6,height:6,borderRadius:'50%',background:'#22C55E',animation:'blink 1.3s infinite',display:'inline-block' }}/> LIVE
            </div>
          </div>
        </div>

        <div style={{ flex:1, display:'grid', gridTemplateColumns:'320px 1fr', overflow:'hidden' }}>
          {/* ── QUEUE ──────────────────────────────────────────────────── */}
          <div style={{ borderRight:'.5px solid rgba(255,255,255,.09)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'10px 13px', borderBottom:'.5px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:1, color:'#666' }}>INCIDENT QUEUE</span>
              <div style={{ display:'flex', gap:4 }}>
                {['all','critical','pending'].map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{ padding:'3px 8px', borderRadius:4, fontSize:9, fontFamily:"'DM Mono',monospace", cursor:'pointer', border:`.5px solid ${filter===f?'#E8281A':'rgba(255,255,255,.1)'}`, color:filter===f?'#E8281A':'#555', background:filter===f?'rgba(232,40,26,.08)':'transparent', textTransform:'uppercase', letterSpacing:.5 }}>{f}</button>
                ))}
              </div>
            </div>

            <div style={{ flex:1, overflowY:'auto' }}>
              {shown.length === 0 && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:160, color:'#333', gap:8 }}>
                  <div style={{ fontSize:26, opacity:.4 }}>📡</div>
                  <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace" }}>No incidents</div>
                </div>
              )}
              {shown.map(c => (
                <div key={c.id} onClick={()=>setSelId(c.id)} style={{ padding:'10px 13px', borderBottom:'.5px solid rgba(255,255,255,.05)', cursor:'pointer', display:'flex', gap:8, alignItems:'flex-start', background:c.id===selId?'#1A1A1A':'transparent', borderLeft:`2px solid ${c.id===selId?sevColor(c.sev):'transparent'}`, transition:'background .1s' }}>
                  <div style={{ width:34, height:34, borderRadius:7, background:sevBg(c.sev), color:sevColor(c.sev), display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:14, flexShrink:0 }}>{c.score}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:3 }}>{c.title}</div>
                    <div style={{ fontSize:10, color:'#666', display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{ background:sevBg(c.sev), color:sevColor(c.sev), padding:'1px 6px', borderRadius:20, fontFamily:"'DM Mono',monospace", fontSize:9 }}>{c.sev.toUpperCase()}</span>
                      {c.amb && <span style={{ color:'#3B82F6' }}>● {c.amb}</span>}
                    </div>
                    <div style={{ height:3, background:'rgba(255,255,255,.07)', borderRadius:2, overflow:'hidden', marginTop:5 }}>
                      <div style={{ height:'100%', width:`${c.score}%`, background:sevColor(c.sev), borderRadius:2 }}/>
                    </div>
                    <div style={{ fontSize:9, color:'#3a3a3a', fontFamily:"'DM Mono',monospace", marginTop:3 }}>{relTime(c.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── MAP + DETAIL ──────────────────────────────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* MAP */}
            <div style={{ flex:1, overflow:'hidden' }}>
              <MapView cases={shown} ambs={ambs} selectedId={selId} onSelect={setSelId} routePolyline={routePoly}/>
            </div>

            {/* DETAIL PANEL */}
            <div style={{ height:200, borderTop:'.5px solid rgba(255,255,255,.09)', display:'flex', flexDirection:'column', flexShrink:0 }}>
              <div style={{ padding:'8px 14px', borderBottom:'.5px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:1, color:'#555' }}>INCIDENT DETAIL</span>
                {sel && <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#E8281A' }}>{sel.id}</span>}
              </div>

              <div style={{ flex:1, overflow:'auto', padding:'10px 14px' }}>
                {!sel ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#333', fontSize:11, fontFamily:"'DM Mono',monospace" }}>← Select an incident from the queue</div>
                ) : (
                  <div style={{ display:'flex', gap:14, height:'100%' }}>
                    {/* AI assessment */}
                    <div style={{ flex:1, background:'#0f0f0f', borderRadius:8, padding:11, border:'.5px solid rgba(255,255,255,.07)', fontSize:11, color:'#777', lineHeight:1.7, overflowY:'auto' }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'#3a3a3a', letterSpacing:1, marginBottom:6 }}>AI TRIAGE ASSESSMENT</div>
                      {sel.ai}
                      <div style={{ marginTop:8, display:'flex', gap:5, flexWrap:'wrap' }}>
                        {(sel.kw||[]).map(k=><span key={k} style={{ background:'rgba(232,40,26,.1)', color:'#E24B4A', padding:'1px 7px', borderRadius:20, fontSize:9, fontFamily:"'DM Mono',monospace" }}>{k}</span>)}
                      </div>
                      {sel.vision?.length>0 && <div style={{ marginTop:6, fontSize:10, color:'#555' }}>👁 Vision: {sel.vision.slice(0,3).join(', ')}</div>}
                    </div>

                    {/* Meta */}
                    <div style={{ minWidth:152 }}>
                      {[
                        ['SCORE',   `${sel.score}/100`,          sevColor(sel.sev)],
                        ['SEVERITY', sel.sev.toUpperCase(),      ''],
                        ['STATUS',  sel.status.toUpperCase(),    ''],
                        ['LOCATION', sel.loc?.slice(0,22)||'—',  ''],
                        sel.amb ? ['UNIT', `${sel.amb}·${sel.eta}`, '#3B82F6'] : null
                      ].filter(Boolean).map(([l,v,col])=>(
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, paddingBottom:6, borderBottom:'.5px solid rgba(255,255,255,.06)' }}>
                          <span style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace" }}>{l}</span>
                          <span style={{ fontSize:10, fontWeight:500, color:col||'#EFEFEF' }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:140 }}>
                      {dispatching === sel.id ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 11px', border:'.5px solid rgba(255,255,255,.1)', borderRadius:7, fontSize:10, color:'#666' }}>
                          <Spinner size={12}/> Dispatching…
                        </div>
                      ) : !sel.amb ? (
                        <Btn col="#E8281A" onClick={()=>handleDispatch(sel.id)}>🚑 DISPATCH UNIT</Btn>
                      ) : (
                        <Btn col="#22C55E" disabled>✓ DISPATCHED</Btn>
                      )}
                      <Btn col="#3B82F6" onClick={()=>handleCall(sel)}>📞 CALL COORDINATOR</Btn>
                      <Btn onClick={()=>handleResolve(sel.id)}>✓ Mark Resolved</Btn>
                      {sel.hasImage && <Btn>🖼 View Photo</Btn>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CALL MODAL ───────────────────────────────────────────────────── */}
      {callModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(4px)' }} onClick={e=>e.target===e.currentTarget&&(setCallModal(null),setCallPhase(null))}>
          <div style={{ background:'#141414', border:'.5px solid rgba(255,255,255,.12)', borderRadius:14, padding:36, textAlign:'center', maxWidth:360, width:'92%', animation:'fadeUp .3s ease' }}>
            <div style={{ fontSize:44, marginBottom:14 }}>{callPhase==='connected'?'📞':'☎️'}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:callPhase==='connected'?'#22C55E':'#F59E0B' }}>
              {callPhase==='connecting'?'CONNECTING…':callPhase==='connected'?'CALL LIVE':'MOCK CALL ACTIVE'}
            </div>
            <div style={{ color:'#666', fontSize:13, marginTop:8, lineHeight:1.7 }}>
              {callPhase==='mock' && `Free WebRTC call system.\nBoth dispatcher + ambulance must have app open.\nCase: ${callModal.id}`}
              {callPhase==='connecting' && 'Establishing connection…'}
            </div>
            {callPhase==='mock' && (
              <div style={{ margin:'14px 0', padding:11, background:'rgba(245,158,11,.07)', border:'.5px solid rgba(245,158,11,.25)', borderRadius:7, fontSize:10, color:'#F59E0B', fontFamily:"'DM Mono',monospace", textAlign:'left' }}>
                WebRTC peer-to-peer audio<br/>Uses Google STUN (free)<br/>Deploy backend for full call routing
              </div>
            )}
            <button onClick={()=>{setCallModal(null);setCallPhase(null);}} style={{ marginTop:14, background:callPhase==='connected'?'#E8281A':'#2a2a2a', color:'#fff', border:'none', fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:2, padding:'10px 28px', borderRadius:7, cursor:'pointer' }}>
              {callPhase==='connected'?'END CALL':'CLOSE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({ children, onClick, col, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding:'8px 11px', borderRadius:7, fontSize:10, fontFamily:"'DM Mono',monospace", cursor:disabled?'default':'pointer', border:`.5px solid ${col||'rgba(255,255,255,.12)'}`, color:disabled?'#22C55E':col||'#666', background:col&&!disabled?`${col}14`:'transparent', letterSpacing:.5, transition:'all .15s' }}>
      {children}
    </button>
  );
}
