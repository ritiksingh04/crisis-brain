export default function Spinner({ size=20, color='#E8281A' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid rgba(255,255,255,.1)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
      flexShrink: 0
    }} />
  );
}
