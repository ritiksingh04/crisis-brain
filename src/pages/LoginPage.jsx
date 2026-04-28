import { useState } from 'react';
import { AuthService } from '../services/firebase';
import Spinner from '../components/Spinner';

const INP = { width:'100%', background:'#1A1A1A', border:'.5px solid rgba(255,255,255,.12)', color:'#EFEFEF', padding:'11px 13px', borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none' };

export default function LoginPage({ onLogin, onBack }) {
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    const res = await AuthService.signIn(email.trim(), pass);
    setLoading(false);
    res.ok ? onLogin(res.user) : setErr(res.error);
  }

  function fill(em, pw) { setEmail(em); setPass(pw); }

  return (
    <div style={{ minHeight:'calc(100vh - 58px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-200, left:'50%', transform:'translateX(-50%)', width:700, height:500, background:'radial-gradient(ellipse,rgba(232,40,26,.06),transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:420, animation:'fadeUp .4s ease both' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:3, color:'#EFEFEF' }}>CRISIS<span style={{ color:'#E8281A' }}>BRAIN</span></div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2.5, color:'#555', marginTop:5 }}>STAFF OPERATIONS PORTAL</div>
        </div>

        <div style={{ background:'#141414', border:'.5px solid rgba(255,255,255,.11)', borderRadius:14, padding:32, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#E8281A,transparent)' }}/>

          {/* Role tabs (display only) */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5, marginBottom:24, background:'#1A1A1A', borderRadius:8, padding:4 }}>
            {['DISPATCHER','ADMIN','AMBULANCE'].map(r => (
              <div key={r} style={{ padding:'7px 4px', borderRadius:6, fontSize:9, fontFamily:"'DM Mono',monospace", textAlign:'center', color:'#555', letterSpacing:.5 }}>{r}</div>
            ))}
          </div>

          {err && <div style={{ background:'rgba(232,40,26,.1)', border:'.5px solid rgba(232,40,26,.3)', color:'#ff6b6b', padding:'9px 13px', borderRadius:7, fontSize:11, fontFamily:"'DM Mono',monospace", marginBottom:14 }}>✗ {err}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1.5, color:'#666', marginBottom:7 }}>EMPLOYEE EMAIL</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="dispatcher@crisisbrain.ai" style={INP} autoComplete="email"/>
            </div>
            <div style={{ marginBottom:8 }}>
              <label style={{ display:'block', fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1.5, color:'#666', marginBottom:7 }}>PASSWORD</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} required placeholder="••••••••" style={INP} autoComplete="current-password"/>
            </div>
            <div style={{ textAlign:'right', marginBottom:20 }}>
              <span style={{ fontSize:11, color:'#555', fontFamily:"'DM Mono',monospace", cursor:'pointer' }}>Forgot password?</span>
            </div>
            <button type="submit" disabled={loading} style={{ width:'100%', background:'#E8281A', color:'#fff', border:'none', fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:3, padding:13, borderRadius:7, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, opacity:loading?.7:1, boxShadow:'0 0 22px rgba(232,40,26,.25)' }}>
              {loading ? <><Spinner size={16} color="#fff"/> AUTHENTICATING…</> : 'SIGN IN TO COMMAND'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop:18, padding:13, background:'#111', borderRadius:8, border:'.5px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:'#3a3a3a', letterSpacing:1.5, marginBottom:10 }}>DEMO CREDENTIALS — CLICK TO FILL</div>
            {[['Dispatcher','dispatcher@crisisbrain.ai','dispatch123'],['Admin','admin@crisisbrain.ai','admin123'],['Ambulance','amb1@crisisbrain.ai','amb123']].map(([role,em,pw])=>(
              <div key={role} onClick={()=>fill(em,pw)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'.5px solid rgba(255,255,255,.05)', cursor:'pointer' }}>
                <div>
                  <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:'#666' }}>{em}</div>
                  <div style={{ fontSize:10, color:'#3a3a3a' }}>pw: {pw}</div>
                </div>
                <span style={{ fontSize:9, color:'#E8281A', fontFamily:"'DM Mono',monospace" }}>FILL →</span>
              </div>
            ))}
            <div style={{ fontSize:9, color:'#3a3a3a', fontFamily:"'DM Mono',monospace", marginTop:10, lineHeight:1.6 }}>
              Firebase Auth: add real users in<br/>Firebase Console → Authentication.
            </div>
          </div>
        </div>

        <button onClick={onBack} style={{ display:'block', textAlign:'center', marginTop:16, width:'100%', background:'none', border:'none', fontSize:12, color:'#555', cursor:'pointer', fontFamily:"'DM Mono',monospace" }}>← Back to SOS page</button>
      </div>
    </div>
  );
}
