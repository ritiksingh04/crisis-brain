import { useState, useRef } from 'react';
import { CaseService } from '../services/firebase';
import { triageCase } from '../services/api';
import { genId } from '../utils/helpers';
import Spinner from '../components/Spinner';

const C = {
  panel:'#141414', b2:'rgba(255,255,255,.11)', b1:'rgba(255,255,255,.06)',
  red:'#E8281A', txt:'#EFEFEF', m1:'#888', m2:'#555', dark3:'#1A1A1A',
  grn:'#22C55E', amb:'#F59E0B'
};

const INPUT = {
  background:'#1A1A1A', border:'.5px solid rgba(255,255,255,.12)', color:'#EFEFEF',
  padding:'11px 13px', borderRadius:8, fontFamily:"'DM Sans',sans-serif",
  fontSize:14, width:'100%', outline:'none', transition:'border-color .2s'
};

export default function SOSPage() {
  const [phase,    setPhase]   = useState('form');
  const [desc,     setDesc]    = useState('');
  const [name,     setName]    = useState('');
  const [phone,    setPhone]   = useState('');
  const [locVal,   setLocVal]  = useState('');
  const [sev,      setSev]     = useState('critical');
  const [gps,      setGps]     = useState(null);
  const [locMsg,   setLocMsg]  = useState('');
  const [img64,    setImg64]   = useState(null);
  const [imgPrev,  setImgPrev] = useState(null);
  const [result,   setResult]  = useState(null);
  const [err,      setErr]     = useState('');
  const fileRef = useRef();

  async function detectGPS() {
    setLocMsg('⏳ Requesting GPS…');
    if (!navigator.geolocation) { setLocMsg('✗ GPS not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      p => {
        const { latitude: la, longitude: ln, accuracy: ac } = p.coords;
        setGps({ lat: la, lng: ln });
        setLocVal(`${la.toFixed(5)}, ${ln.toFixed(5)}`);
        setLocMsg(`✓ GPS locked ±${Math.round(ac)}m`);
      },
      () => setLocMsg('✗ GPS denied — enter address manually'),
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setImgPrev(ev.target.result); setImg64(ev.target.result.split(',')[1]); };
    r.readAsDataURL(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!desc.trim() || !locVal.trim()) return;
    setPhase('processing'); setErr('');

    // ── triage with 4 s timeout + instant fallback ──────────────────────────
    let triage;
    try {
      triage = await triageCase({ description: desc, severity: sev, imageBase64: img64, lat: gps?.lat, lng: gps?.lng });
    } catch {
      triage = { score: sev==='critical'?85:sev==='high'?60:40, severity: sev, ai_assessment: 'Local triage (backend offline)', keywords:[], vision_labels:[], source:'local' };
    }

    const caseData = {
      title: desc.slice(0, 65), description: desc,
      name: name || 'Anonymous', phone: phone || '',
      loc: locVal, sev: triage.severity, score: triage.score,
      ai: triage.ai_assessment, kw: triage.keywords || [], vision: triage.vision_labels || [],
      status: 'pending', amb: null, eta: null,
      lat: gps?.lat || null, lng: gps?.lng || null,
      mapX: Math.floor(60 + Math.random() * 560), mapY: Math.floor(40 + Math.random() * 300),
      hasImage: !!img64, triageSource: triage.source, time: new Date().toISOString()
    };

    let id;

try {
  id = await CaseService.add(caseData);
} catch (err) {
  console.error("Firestore add failed:", err);
  setErr("Unable to save case to Firestore.");
  setPhase("form");
  return;
}
    setResult({ id, triage }); setPhase('success');
  }

  if (phase === 'success' && result) return <SuccessScreen result={result} onReset={() => { setPhase('form'); setResult(null); setDesc(''); setImg64(null); setImgPrev(null); setGps(null); setLocVal(''); setLocMsg(''); setName(''); setPhone(''); }} />;

  return (
    <div style={{ color: C.txt }}>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'80px 28px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)`, backgroundSize:'48px 48px', maskImage:'radial-gradient(ellipse 80% 80% at 50%,black 0%,transparent 70%)' }}/>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 55% 50% at 50% 60%,rgba(232,40,26,.07),transparent 70%)' }}/>
        <div style={{ position:'relative', zIndex:1, maxWidth:800 }}>
          {[
            <div key="tag" style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, color:C.red, border:`.5px solid rgba(232,40,26,.4)`, padding:'5px 14px', borderRadius:20, marginBottom:28, background:'rgba(232,40,26,.05)', animation:'fadeUp .4s ease both' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:C.red, animation:'blink 1.4s infinite', display:'inline-block' }}/> AI-POWERED EMERGENCY RESPONSE
            </div>,
            <h1 key="h1" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(64px,11vw,130px)', lineHeight:.9, letterSpacing:4, marginBottom:22, animation:'fadeUp .5s .1s ease both' }}>
              SEND <span style={{ color:C.red }}>SOS</span><br/>GET HELP<br/>FAST.
            </h1>,
            <p key="sub" style={{ fontSize:17, color:C.m1, maxWidth:500, margin:'0 auto 44px', fontWeight:300, lineHeight:1.85, animation:'fadeUp .5s .2s ease both' }}>
              AI triages your emergency and routes the nearest ambulance in real time. No account required.
            </p>,
            <a key="btn" href="#sos" style={{ display:'inline-flex', alignItems:'center', gap:12, background:C.red, color:'#fff', fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, padding:'17px 50px', borderRadius:4, textDecoration:'none', boxShadow:'0 0 40px rgba(232,40,26,.35)', animation:'fadeUp .5s .3s ease both' }}>
              <span style={{ width:22, height:22, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>!</span>
              SEND EMERGENCY SOS
            </a>,
            <p key="note" style={{ marginTop:16, fontSize:11, color:'#444', fontFamily:"'DM Mono',monospace", letterSpacing:.5, animation:'fadeUp .5s .4s ease both' }}>NO ACCOUNT · GPS AUTO-DETECT · VISION AI TRIAGE</p>
          ]}
        </div>
        <div style={{ position:'absolute', bottom:36, left:'50%', transform:'translateX(-50%)', opacity:.3, display:'flex', flexDirection:'column', alignItems:'center', gap:7 }}>
          <span style={{ fontSize:9, letterSpacing:2.5, fontFamily:"'DM Mono',monospace", color:C.m1 }}>SCROLL</span>
          <div style={{ width:.5, height:36, background:`linear-gradient(to bottom,${C.m1},transparent)` }}/>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 28px', maxWidth:1040, margin:'0 auto' }}>
        <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:3, color:C.red, marginBottom:10 }}>HOW IT WORKS</p>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, letterSpacing:2, marginBottom:40, lineHeight:1 }}>AI DECIDES. HELP ARRIVES.</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
          {[
            { icon:'📍', n:'01', t:'Send SOS',              d:'Describe the emergency, share GPS, upload photo. 30 seconds, no login.' },
            { icon:'👁', n:'02', t:'Vision AI scans image', d:'Google Vision detects wounds and injury severity from your photo.' },
            { icon:'🧠', n:'03', t:'AI scores priority',    d:'Combined text + image analysis assigns 0–100 score instantly.' },
            { icon:'📏', n:'04', t:'Distance Matrix',       d:'Real drive time from every ambulance calculated via Google API.' },
            { icon:'🚑', n:'05', t:'Unit dispatched',       d:'Nearest unit auto-routed via Directions API. Live ETA on map.' },
          ].map(s => (
            <div key={s.n} style={{ background:C.panel, border:`.5px solid ${C.b2}`, borderRadius:12, padding:'24px 20px', position:'relative', overflow:'hidden' }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:54, color:'rgba(255,255,255,.04)', position:'absolute', top:8, right:14, lineHeight:1 }}>{s.n}</div>
              <div style={{ fontSize:22, marginBottom:11 }}>{s.icon}</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>{s.t}</div>
              <div style={{ fontSize:12, color:C.m1, lineHeight:1.7 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOS FORM ─────────────────────────────────────────────────────── */}
      <section id="sos" style={{ padding:'0 28px 100px', maxWidth:940, margin:'0 auto' }}>
        <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:3, color:C.red, marginBottom:10 }}>EMERGENCY FORM</p>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, letterSpacing:2, marginBottom:8, lineHeight:1 }}>REPORT AN INCIDENT</h2>
        <p style={{ color:C.m1, fontSize:14, marginBottom:32, lineHeight:1.7 }}>Every detail helps AI assess severity faster.</p>

        <div style={{ background:C.panel, border:`.5px solid ${C.b2}`, borderRadius:14, padding:36, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${C.red},transparent)` }}/>

          {/* Processing overlay */}
          {phase === 'processing' && (
            <div style={{ position:'absolute', inset:0, background:'rgba(10,10,10,.9)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:20, borderRadius:14 }}>
              <Spinner size={44} />
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:C.red, marginTop:18 }}>ANALYZING…</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.m1, marginTop:6 }}>AI triage in progress (max 4s)</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>

              <Field label="YOUR NAME (OPTIONAL)">
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rahul Sharma" style={INPUT}/>
              </Field>
              <Field label="CONTACT (OPTIONAL)">
                <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="+91 XXXXX XXXXX" style={INPUT}/>
              </Field>

              <div style={{ gridColumn:'1/-1' }}>
                <Field label="DESCRIBE THE EMERGENCY *">
                  <textarea value={desc} onChange={e=>setDesc(e.target.value)} required placeholder="What happened? How many people? Any injuries?" style={{ ...INPUT, minHeight:90, resize:'vertical' }}/>
                </Field>
              </div>

              <div style={{ gridColumn:'1/-1' }}>
                <Field label="SEVERITY LEVEL">
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                    {[['critical','#E24B4A','rgba(226,75,74,.18)'],['high','#F59E0B','rgba(245,158,11,.18)'],['medium','#22C55E','rgba(34,197,94,.18)']].map(([v,col,gl])=>(
                      <label key={v} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'12px 6px', border:`.5px solid ${sev===v?col:C.b2}`, borderRadius:8, cursor:'pointer', background:sev===v?'rgba(0,0,0,.3)':'#1A1A1A', fontSize:11, color:sev===v?C.txt:C.m1, boxShadow:sev===v?`0 0 14px ${gl}`:'none', transition:'all .18s' }}>
                        <input type="radio" name="sev" value={v} checked={sev===v} onChange={()=>setSev(v)} style={{ display:'none' }}/>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:col }}/>{v.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>

              <div style={{ gridColumn:'1/-1' }}>
                <Field label="LOCATION *">
                  <div style={{ display:'flex', gap:10 }}>
                    <input value={locVal} onChange={e=>setLocVal(e.target.value)} required placeholder="Address or landmark" style={{ ...INPUT, flex:1 }}/>
                    <button type="button" onClick={detectGPS} style={{ background:'#1A1A1A', border:`.5px solid ${C.b2}`, color:C.m1, padding:'0 14px', borderRadius:8, cursor:'pointer', fontSize:11, fontFamily:"'DM Mono',monospace", whiteSpace:'nowrap' }}>📍 GPS</button>
                  </div>
                  {locMsg && <div style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:locMsg.startsWith('✓')?C.grn:locMsg.startsWith('✗')?'#E24B4A':C.m1, marginTop:5 }}>{locMsg}</div>}
                </Field>
              </div>

              <div style={{ gridColumn:'1/-1' }}>
                <Field label="PHOTO — GOOGLE VISION AI WILL ANALYZE INJURY SEVERITY (OPTIONAL)">
                  {!imgPrev ? (
                    <div onClick={()=>fileRef.current.click()} style={{ border:`1px dashed ${C.m2}`, borderRadius:8, padding:26, textAlign:'center', cursor:'pointer', background:'#0A0A0A', transition:'border-color .2s' }}>
                      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display:'none' }}/>
                      <div style={{ fontSize:22, marginBottom:7 }}>📷</div>
                      <div style={{ fontSize:12, color:C.m1 }}>Drop photo or <span style={{ color:C.red }}>click to upload</span></div>
                      <div style={{ fontSize:10, color:C.m2, marginTop:4, fontFamily:"'DM Mono',monospace" }}>Vision API detects wounds, injury type, severity</div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:14, padding:14, background:'#0A0A0A', border:`.5px solid ${C.b2}`, borderRadius:8 }}>
                      <img src={imgPrev} alt="" style={{ maxHeight:80, maxWidth:120, borderRadius:6, objectFit:'cover' }}/>
                      <div>
                        <div style={{ fontSize:11, color:C.grn, fontFamily:"'DM Mono',monospace" }}>✓ Image attached — Vision AI will analyze</div>
                        <button type="button" onClick={()=>{setImg64(null);setImgPrev(null);}} style={{ marginTop:8, background:'none', border:`.5px solid ${C.b2}`, color:C.m1, padding:'3px 10px', borderRadius:4, fontSize:10, cursor:'pointer', fontFamily:"'DM Mono',monospace" }}>Remove</button>
                      </div>
                    </div>
                  )}
                </Field>
              </div>
            </div>

            {err && <div style={{ background:'rgba(232,40,26,.1)', border:'.5px solid rgba(232,40,26,.3)', color:'#ff6b6b', padding:'10px 13px', borderRadius:7, fontSize:12, fontFamily:"'DM Mono',monospace", marginTop:14 }}>{err}</div>}

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:24, paddingTop:20, borderTop:`.5px solid ${C.b1}` }}>
              <div style={{ fontSize:11, color:'#3a3a3a', fontFamily:"'DM Mono',monospace", lineHeight:1.6 }}>Info shared only with<br/>emergency responders.</div>
              <button type="submit" disabled={!desc.trim()||!locVal.trim()||phase==='processing'} style={{ background:C.red, color:'#fff', border:'none', fontFamily:"'Bebas Neue',sans-serif", fontSize:19, letterSpacing:2.5, padding:'13px 40px', borderRadius:4, cursor:'pointer', opacity:(!desc.trim()||!locVal.trim())?.45:1, boxShadow:'0 0 22px rgba(232,40,26,.3)' }}>
                DISPATCH HELP NOW →
              </button>
            </div>
          </form>
        </div>
      </section>

      <footer style={{ borderTop:`.5px solid ${C.b1}`, padding:'22px 28px', display:'flex', justifyContent:'space-between', color:'#333', fontSize:11, fontFamily:"'DM Mono',monospace" }}>
        <span>CRISISBRAIN © 2025 · Firebase + Google Maps + Vision AI</span>
        <span style={{ color:'#555' }}>Powered by Google Cloud</span>
      </footer>
    </div>
  );
}

function SuccessScreen({ result: { id, triage }, onReset }) {
  const sc = triage.severity==='critical'?'#E24B4A':triage.severity==='high'?'#F59E0B':'#22C55E';
  const stages = ['RECEIVED','AI TRIAGE','DISPATCHING','EN ROUTE','ARRIVED'];
  return (
    <div style={{ minHeight:'calc(100vh - 58px)', display:'flex', alignItems:'center', justifyContent:'center', padding:28 }}>
      <div style={{ textAlign:'center', maxWidth:540, animation:'fadeUp .5s ease' }}>
        <div style={{ width:68, height:68, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'1px solid #22C55E', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', fontSize:26 }}>✓</div>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:50, letterSpacing:2, color:'#22C55E' }}>SOS RECEIVED</h2>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:'#E8281A', margin:'10px 0 4px' }}>CASE ID: {id}</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:sc, marginBottom:10 }}>PRIORITY SCORE: {triage.score} / 100</div>
        {triage.vision_labels?.length > 0 && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#666', marginBottom:8 }}>Vision: {triage.vision_labels.slice(0,4).join(', ')}</div>}
        <div style={{ fontSize:13, color:'#777', maxWidth:440, margin:'0 auto 26px', lineHeight:1.7, background:'rgba(255,255,255,.03)', padding:13, borderRadius:8, border:'.5px solid rgba(255,255,255,.09)', textAlign:'left' }}>{triage.ai_assessment}</div>
        <div style={{ display:'flex', alignItems:'center', margin:'0 auto 26px', maxWidth:480 }}>
          {stages.map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', flex:1 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:i<2?'#22C55E':i===2?'#F59E0B':'#333', boxShadow:i===2?'0 0 10px #F59E0B':'none', animation:i===2?'blink 1s infinite':'none' }}/>
                <div style={{ fontSize:8, color:'#555', fontFamily:"'DM Mono',monospace", whiteSpace:'nowrap' }}>{s}</div>
              </div>
              {i<stages.length-1&&<div style={{ flex:1, height:1, background:i<2?'#22C55E':'#333', margin:'0 3px', marginBottom:14 }}/>}
            </div>
          ))}
        </div>
        {triage.source?.includes('local') && <div style={{ background:'rgba(245,158,11,.08)', border:'.5px solid rgba(245,158,11,.25)', color:'#F59E0B', padding:'7px 14px', borderRadius:6, fontSize:11, fontFamily:"'DM Mono',monospace", marginBottom:14 }}>⚠ Scored locally — backend offline. Updates when reconnected.</div>}
        <button onClick={onReset} style={{ background:'#E8281A', color:'#fff', border:'none', fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:2, padding:'11px 32px', borderRadius:4, cursor:'pointer' }}>SUBMIT ANOTHER SOS</button>
        <div style={{ marginTop:12, fontSize:11, color:'#3a3a3a', fontFamily:"'DM Mono',monospace" }}>Save Case ID to track with staff portal.</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      <label style={{ fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1.5, color:'#666' }}>{label}</label>
      {children}
    </div>
  );
}
