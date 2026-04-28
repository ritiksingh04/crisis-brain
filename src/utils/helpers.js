export const sevColor = s => s==='critical'?'#E24B4A':s==='high'?'#F59E0B':'#22C55E';
export const sevBg    = s => s==='critical'?'rgba(232,40,26,.13)':s==='high'?'rgba(245,158,11,.11)':'rgba(34,197,94,.1)';

export function relTime(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  return `${Math.floor(d/3600)}h ago`;
}

export function genId() {
  return 'CB-' + Date.now().toString(36).toUpperCase();
}
