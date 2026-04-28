import { useState, useEffect } from 'react';
import { AuthService } from './services/firebase';
import { useFirebaseInit, useOnlineStatus } from './hooks/useFirebase';
import SOSPage       from './pages/SOSPage';
import LoginPage     from './pages/LoginPage';
import Dashboard     from './pages/Dashboard';
import AmbulancePage from './pages/AmbulancePage';

export default function App() {
  const { ready, fbOK }   = useFirebaseInit();
  const online             = useOnlineStatus();
  const [user,  setUser]   = useState(null);
  const [view,  setView]   = useState('sos');

  useEffect(() => {
    const u = AuthService.getUser();
    if (u?.loggedIn) { setUser(u); setView(u.role === 'ambulance' ? 'ambulance' : 'dashboard'); }
  }, []);

  const login  = u => { setUser(u); setView(u.role === 'ambulance' ? 'ambulance' : 'dashboard'); };
  const logout = () => { AuthService.signOut(); setUser(null); setView('sos'); };

  if (!ready) return <Splash />;

  return (
    <div style={{ background:'#0A0A0A', minHeight:'100vh' }}>
      {/* Offline banner */}
      {!online && (
        <div style={{ background:'#854F0B', color:'#FAEEDA', padding:'7px 20px', textAlign:'center', fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:.5, position:'fixed', top:0, left:0, right:0, zIndex:9999 }}>
          ⚠ OFFLINE — SOS saved locally, syncs when connection restores
        </div>
      )}

      {/* Nav */}
      <nav style={{
        position:'fixed', top:!online?34:0, left:0, right:0, zIndex:200, height:58,
        display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px',
        background:'rgba(10,10,10,0.98)', backdropFilter:'blur(12px)',
        borderBottom:'.5px solid rgba(255,255,255,.08)',
      }}>
        <button onClick={()=>setView('sos')} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:9 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#E8281A', display:'inline-block', animation:'blink 1.4s infinite' }}/>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:23, letterSpacing:3, color:'#EFEFEF' }}>CRISIS<span style={{ color:'#E8281A' }}>BRAIN</span></span>
        </button>

        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{
            fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1,
            color: !online ? '#F59E0B' : fbOK ? '#22C55E' : '#F59E0B',
            border: `.5px solid ${!online ? 'rgba(245,158,11,.35)' : fbOK ? 'rgba(34,197,94,.35)' : 'rgba(245,158,11,.35)'}`,
            padding:'4px 12px', borderRadius:20,
            background: !online ? 'rgba(245,158,11,.05)' : fbOK ? 'rgba(34,197,94,.05)' : 'rgba(245,158,11,.05)'
          }}>
            {!online ? '● OFFLINE' : fbOK ? '● SYSTEM ACTIVE' : '● LOCAL MODE'}
          </div>

          {!user ? (
            <button onClick={()=>setView('login')} style={{ background:'transparent', border:'.5px solid rgba(255,255,255,.12)', color:'#777', padding:'7px 16px', borderRadius:7, fontFamily:"'DM Sans',sans-serif", fontSize:12, cursor:'pointer' }}>
              Staff Portal →
            </button>
          ) : (
            <>
              <button onClick={()=>setView(user.role==='ambulance'?'ambulance':'dashboard')} style={{ background:'transparent', border:'.5px solid rgba(34,197,94,.3)', color:'#22C55E', padding:'7px 16px', borderRadius:7, fontFamily:"'DM Sans',sans-serif", fontSize:12, cursor:'pointer' }}>
                Command →
              </button>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#555' }}>{user.name}</span>
              <button onClick={logout} style={{ background:'transparent', border:'.5px solid rgba(255,255,255,.1)', color:'#555', padding:'7px 14px', borderRadius:7, fontFamily:"'DM Sans',sans-serif", fontSize:12, cursor:'pointer' }}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Page content */}
      <div style={{ paddingTop: !online ? 92 : 58 }}>
        {view === 'sos'       && <SOSPage />}
        {view === 'login'     && <LoginPage onLogin={login} onBack={()=>setView('sos')} />}
        {view === 'dashboard' && user && <Dashboard user={user} onLogout={logout} />}
        {view === 'ambulance' && user && <AmbulancePage user={user} onLogout={logout} />}
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div style={{ background:'#0A0A0A', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, letterSpacing:5, color:'#E8281A' }}>CRISISBRAIN</div>
      <div style={{ display:'flex', gap:6 }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#E8281A', animation:`blink 1s ${i*.2}s infinite` }}/>
        ))}
      </div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#333', letterSpacing:2, marginTop:4 }}>INITIALIZING…</div>
    </div>
  );
}
