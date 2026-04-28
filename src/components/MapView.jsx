import { useEffect, useRef, useState } from 'react';
import { MAPS_KEY } from '../services/api';
import { sevColor } from '../utils/helpers';

const DARK = [
  { elementType:'geometry',          stylers:[{ color:'#1a1a2e' }] },
  { elementType:'labels.text.stroke',stylers:[{ color:'#1a1a2e' }] },
  { elementType:'labels.text.fill',  stylers:[{ color:'#746855' }] },
  { featureType:'road',        elementType:'geometry',  stylers:[{ color:'#2c2c3e' }] },
  { featureType:'road.highway',elementType:'geometry',  stylers:[{ color:'#3a3a5c' }] },
  { featureType:'water',       elementType:'geometry',  stylers:[{ color:'#0d1b2a' }] },
  { featureType:'poi',         stylers:[{ visibility:'off' }] },
  { featureType:'transit',     stylers:[{ visibility:'off' }] },
];

export default function MapView({ cases, ambs, selectedId, onSelect, routePolyline }) {
  const divRef    = useRef(null);
  const mapRef    = useRef(null);
  const markersRef= useRef({});
  const polyRef   = useRef(null);
  const [mapsOK,  setMapsOK] = useState(false);

  // Load Maps SDK once
  useEffect(() => {
    if (!MAPS_KEY || MAPS_KEY.startsWith('REPLACE')) return;
    if (window.google?.maps) { initMap(); return; }
    if (document.getElementById('gmaps-script')) return; // already loading

    const s = document.createElement('script');
    s.id  = 'gmaps-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geometry`;
    s.async = true;
    s.onload = () => { initMap(); setMapsOK(true); };
    s.onerror= () => console.warn('[Maps] failed to load, SVG fallback active');
    document.head.appendChild(s);
  }, []);

  function initMap() {
    if (!divRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(divRef.current, {
      center: { lat: 28.6353, lng: 77.3900 }, zoom: 12,
      styles: DARK, zoomControl: true, mapTypeControl: false, streetViewControl: false
    });
    setMapsOK(true);
  }

  // Update markers when data changes
  useEffect(() => {
    if (!mapsOK || !mapRef.current) return;
    Object.values(markersRef.current).forEach(m => m.setMap(null));
    markersRef.current = {};

    cases.forEach(c => {
      if (!c.lat || !c.lng) return;
      const m = new window.google.maps.Marker({
        position: { lat: c.lat, lng: c.lng }, map: mapRef.current,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: c.id === selectedId ? 14 : 9, fillColor: sevColor(c.sev), fillOpacity: .9, strokeColor: '#fff', strokeWeight: c.id === selectedId ? 2 : 1 },
        title: c.title, zIndex: c.id === selectedId ? 100 : c.score
      });
      m.addListener('click', () => onSelect(c.id));
      markersRef.current[c.id] = m;
    });

    ambs.forEach(a => {
      if (!a.lat || !a.lng) return;
      const m = new window.google.maps.Marker({
        position: { lat: a.lat, lng: a.lng }, map: mapRef.current,
        icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 5, fillColor: a.busy ? '#3B82F6' : '#22C55E', fillOpacity: .9, strokeColor: '#fff', strokeWeight: 1 },
        title: a.id
      });
      markersRef.current[`a-${a.id}`] = m;
    });
  }, [cases, ambs, selectedId, mapsOK]);

  // Draw route
  useEffect(() => {
    if (!mapsOK || !mapRef.current) return;
    if (polyRef.current) polyRef.current.setMap(null);
    if (!routePolyline) return;
    try {
      const path = window.google.maps.geometry.encoding.decodePath(routePolyline);
      polyRef.current = new window.google.maps.Polyline({ path, map: mapRef.current, strokeColor:'#3B82F6', strokeWeight:3, strokeOpacity:.8 });
    } catch {}
  }, [routePolyline, mapsOK]);

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      {/* Google Map div */}
      <div ref={divRef} style={{ width:'100%', height:'100%', display: mapsOK ? 'block' : 'none' }} />
      {/* SVG fallback */}
      {!mapsOK && <SVGFallback cases={cases} ambs={ambs} selectedId={selectedId} onSelect={onSelect} />}
      {/* Legend */}
      <div style={{ position:'absolute', top:12, right:12, background:'rgba(14,14,14,.95)', border:'.5px solid rgba(255,255,255,.12)', borderRadius:10, padding:'11px 13px', backdropFilter:'blur(8px)' }}>
        <div style={{ fontSize:9, color:'#444', fontFamily:"'DM Mono',monospace", letterSpacing:1.5, marginBottom:8 }}>LEGEND</div>
        {[['#E24B4A','Critical'],['#F59E0B','High'],['#22C55E','Medium'],['#3B82F6','Ambulance']].map(([col,lbl]) => (
          <div key={lbl} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:col }} />
            <span style={{ fontSize:10, color:'#888', fontFamily:"'DM Mono',monospace" }}>{lbl}</span>
          </div>
        ))}
        {!mapsOK && <div style={{ fontSize:9, color:'#F59E0B', fontFamily:"'DM Mono',monospace", marginTop:7, paddingTop:7, borderTop:'.5px solid rgba(255,255,255,.06)' }}>SVG MODE</div>}
      </div>
    </div>
  );
}

function SVGFallback({ cases, ambs, selectedId, onSelect }) {
  const W = 700, H = 400;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block', background:'#0d0d1a' }}>
      {/* Grid */}
      {Array.from({length:15},(_,i)=><line key={`v${i}`} x1={i*50} y1={0} x2={i*50} y2={H} stroke="rgba(255,255,255,.04)" strokeWidth={.5}/>)}
      {Array.from({length:9}, (_,i)=><line key={`h${i}`} x1={0} y1={i*50} x2={W} y2={i*50} stroke="rgba(255,255,255,.04)" strokeWidth={.5}/>)}
      {/* Roads */}
      {[['120','0','120',H],['280','0','280',H],['460','0','460',H],['600','0','600',H],['0','110',W,'110'],['0','240',W,'240'],['0','340',W,'340']].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,.07)" strokeWidth={2.5}/>
      ))}
      {/* Route lines */}
      {ambs.filter(a=>a.busy&&a.assignedCase).map(a=>{
        const t=cases.find(c=>c.id===a.assignedCase);
        if(!t||!t.mapX||!a.mapX) return null;
        return <line key={a.id+'r'} x1={a.mapX} y1={a.mapY} x2={t.mapX} y2={t.mapY} stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="7,4" opacity={.55}/>;
      })}
      {/* Ambulances */}
      {ambs.map(a=>{
        if(!a.mapX) return null;
        const col=a.busy?'#3B82F6':'#22C55E';
        return <g key={a.id}>
          <rect x={a.mapX-13} y={a.mapY-8} width={26} height={16} rx={3} fill={col} fillOpacity={.12} stroke={col} strokeWidth={.8}/>
          <text x={a.mapX} y={a.mapY+4} textAnchor="middle" fontSize={7} fill={col} fontFamily="monospace">{a.id}</text>
        </g>;
      })}
      {/* Incidents */}
      {cases.map(c=>{
        if(!c.mapX) return null;
        const col=sevColor(c.sev); const r=c.id===selectedId?13:8;
        return <g key={c.id} style={{cursor:'pointer'}} onClick={()=>onSelect(c.id)}>
          {c.id===selectedId&&<circle cx={c.mapX} cy={c.mapY} r={20} fill={col} fillOpacity={.1} stroke={col} strokeWidth={.8}/>}
          <circle cx={c.mapX} cy={c.mapY} r={r} fill={col} opacity={c.id===selectedId?1:.8}/>
          <text x={c.mapX} y={c.mapY+4} textAnchor="middle" fontSize={8} fill="white" fontFamily="sans-serif" style={{pointerEvents:'none'}}>{c.score}</text>
        </g>;
      })}
    </svg>
  );
}
