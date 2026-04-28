import { useState, useCallback, useEffect } from 'react';

const S = {
  wrap: { position:'fixed', top:72, right:14, zIndex:9000, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' },
  item: (urgent) => ({
    background:'#141414', border:`.5px solid ${urgent?'rgba(232,40,26,.5)':'rgba(255,255,255,.12)'}`,
    borderRadius:10, padding:'11px 14px', fontFamily:"'DM Mono',monospace", fontSize:11,
    display:'flex', gap:10, maxWidth:290, pointerEvents:'all',
    boxShadow:'0 4px 20px rgba(0,0,0,.5)', animation:'slideIn .3s ease both'
  })
};

let _addToast = null;
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((icon, title, sub, urgent=false) => {
    const id = Date.now();
    setToasts(t => [...t.slice(-4), { id, icon, title, sub, urgent }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);
  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);
  return { toasts, add };
}

export function toast(icon, title, sub, urgent=false) {
  _addToast?.(icon, title, sub, urgent);
}

export function ToastContainer({ toasts }) {
  return (
    <div style={S.wrap}>
      {toasts.map(t => (
        <div key={t.id} style={S.item(t.urgent)}>
          <span style={{ fontSize:15, flexShrink:0 }}>{t.icon}</span>
          <div>
            <div style={{ color:'#EFEFEF', fontWeight:500, marginBottom:2 }}>{t.title}</div>
            <div style={{ color:'#666', fontSize:10 }}>{t.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
