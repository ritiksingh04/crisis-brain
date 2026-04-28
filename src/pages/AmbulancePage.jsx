import { useState, useEffect } from 'react';
import { useCases, useAmbulances } from '../hooks/useFirebase';
import { CaseService, AmbService } from '../services/firebase';
import { sevColor, sevBg } from '../utils/helpers';
import Spinner from '../components/Spinner';

export default function AmbulancePage({ user, onLogout }) {
  const { cases }           = useCases();
  const { ambs, updateAmb } = useAmbulances();
  const [status, setStatus] = useState('available');
  const [callPhase, setCallPhase] = useState(null);

  const myAmb  = ambs.find(a => a.id === 'AMB-1') || ambs[0];
  const myCase = myAmb ? cases.find(c => c.amb === myAmb.id) : null;

  const SC = { available:'#22C55E', dispatched:'#F59E0B', on_scene:'#3B82F6', returning:'#777' };

  useEffect(() => {
    if (myAmb) setStatus(myAmb.busy ? 'dispatched' : 'available');
  }, [myAmb?.busy]);

  async function markArrived() {
    setStatus('on_scene');
    if (myCase) await CaseService.update(myCase.id, { status:'on_scene' });
  }

  async function markComplete() {
    setStatus('returning');
    if (myCase) {
      await CaseService.update(myCase.id, { status:'resolved' });
      if (myAmb) await AmbService.update(myAmb.id, { busy:false, assignedCase:null });
    }
  }

  async function handleCall() {
    setCallPhase('connecting');
    setTimeout(() => setCallPhase('mock'), 1200);
  }

  return (
    <div style={{ maxWidth:520, margin:'0 auto', padding:'26px 18px', minHeight:'calc(100vh - 58px)', color:'#EFEFEF' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2 }}>TEAM PORTAL</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#555', letterSpacing:.5 }}>{user.name}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:SC[status], border:`.5px solid ${SC[status]}40`, padding:'4px 11px', borderRadius:20 }}>
            ● {status.replace('_',' ').toUpperCase()}
          </div>
          <button onClick={onLogout} style={{ background:'none', border:'.5px solid rgba(255,255,255,.1)', color:'#555', padding:'6px 11px', borderRadius:7, fontSize:11, cursor:'pointer', fontFamily:"'DM Mono',monospace" }}>↩</button>
        </div>
      </div>

      {/* My unit */}
      {myAmb && (
        <div style={{ background:'#141414', border:'.5px solid rgba(255,255,255,.11)', borderRadius:12, padding:18, marginBottom:16 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'#3a3a3a', letterSpacing:1.5, marginBottom:11 }}>MY UNIT</div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:10, background:myAmb.busy?'rgba(59,130,246,.12)':'rgba(34,197,94,.1)', border:`.5px solid ${myAmb.busy?'#3B82F630':'#22C55E30'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🚑</div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2 }}>{myAmb.id}</div>
              <div style={{ fontSize:12, color:'#666' }}>{myAmb.team}</div>
              <div style={{ fontSize:10, color:myAmb.busy?'#F59E0B':'#22C55E', fontFamily:"'DM Mono',monospace", marginTop:2 }}>
                {myAmb.busy ? `DEPLOYED → ${myAmb.assignedCase}` : 'AVAILABLE — STANDBY'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active case */}
      {myCase ? (
        <div style={{ background:'#141414', border:'.5px solid rgba(232,40,26,.28)', borderRadius:12, padding:20, marginBottom:16, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#E8281A,transparent)' }}/>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'#E8281A', letterSpacing:1.5, marginBottom:13 }}>ACTIVE DISPATCH</div>
          <div style={{ display:'flex', gap:11, marginBottom:14 }}>
            <div style={{ width:42, height:42, borderRadius:8, background:sevBg(myCase.sev), color:sevColor(myCase.sev), display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:17, flexShrink:0 }}>{myCase.score}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{myCase.title}</div>
              <div style={{ fontSize:11, color:'#666' }}>{myCase.loc}</div>
              <div style={{ marginTop:5, display:'flex', gap:5, flexWrap:'wrap' }}>
                {(myCase.kw||[]).map(k=><span key={k} style={{ background:`${sevColor(myCase.sev)}15`, color:sevColor(myCase.sev), padding:'1px 7px', borderRadius:20, fontSize:9, fontFamily:"'DM Mono',monospace" }}>{k}</span>)}
              </div>
            </div>
          </div>
          <div style={{ background:'#0f0f0f', borderRadius:8, padding:11, marginBottom:14, fontSize:12, color:'#666', lineHeight:1.7 }}>{myCase.ai}</div>
          {myCase.eta && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:'#3B82F6', marginBottom:14 }}>ETA: {myCase.eta}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {status==='dispatched' && <TB col="#22C55E" onClick={markArrived}>✓ ARRIVED ON SCENE</TB>}
            {status==='on_scene'   && <TB col="#E8281A" onClick={markComplete}>✓ CASE COMPLETE</TB>}
            <TB col="#3B82F6" onClick={handleCall}>
              {callPhase==='connecting' ? <><Spinner size={12} color="#3B82F6"/> Connecting…</> : '📞 CALL COORDINATOR'}
            </TB>
            {myCase.lat && <TB col="#F59E0B" onClick={()=>window.open(`https://maps.google.com/?daddr=${myCase.lat},${myCase.lng}`)}>🗺 OPEN IN MAPS</TB>}
          </div>
          {callPhase==='mock' && (
            <div style={{ marginTop:12, padding:10, background:'rgba(245,158,11,.07)', border:'.5px solid rgba(245,158,11,.25)', borderRadius:7, fontSize:10, color:'#F59E0B', fontFamily:"'DM Mono',monospace" }}>
              Mock call — WebRTC connects when backend is deployed.
            </div>
          )}
        </div>
      ) : (
        <div style={{ background:'#141414', border:'.5px solid rgba(255,255,255,.1)', borderRadius:12, padding:32, textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:28, marginBottom:11, opacity:.4 }}>📡</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, color:'#555' }}>STANDING BY</div>
          <div style={{ fontSize:12, color:'#3a3a3a', marginTop:5 }}>No active dispatch. Monitoring queue.</div>
        </div>
      )}

      {/* Live queue top 5 */}
      <div style={{ background:'#141414', border:'.5px solid rgba(255,255,255,.1)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'10px 14px', borderBottom:'.5px solid rgba(255,255,255,.06)', fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:1, color:'#555' }}>LIVE QUEUE — TOP 5</div>
        {cases.slice(0,5).map(c=>(
          <div key={c.id} style={{ padding:'9px 14px', borderBottom:'.5px solid rgba(255,255,255,.05)', display:'flex', gap:9, alignItems:'center' }}>
            <div style={{ width:30, height:30, borderRadius:6, background:sevBg(c.sev), color:sevColor(c.sev), display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:12, flexShrink:0 }}>{c.score}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.title}</div>
              <div style={{ fontSize:10, color:'#555' }}>{c.loc?.slice(0,30)}</div>
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:c.amb?'#3B82F6':'#3a3a3a' }}>{c.status.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TB({ children, onClick, col }) {
  return (
    <button onClick={onClick} style={{ padding:'9px', borderRadius:7, fontSize:10, fontFamily:"'DM Mono',monospace", cursor:'pointer', border:`.5px solid ${col}40`, color:col, background:`${col}10`, letterSpacing:.5, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
      {children}
    </button>
  );
}
