export default function Footer() {
  return (
    <footer style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', background: '#fff', borderTop: '1px solid #dde1e7', fontSize: 11, color: '#68758a' }}>
      <span style={{ fontWeight: 700, letterSpacing: '0.06em', fontSize: 10.5 }}>ROOM °C</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>10°</span>
      <div style={{ width: 220, height: 10, borderRadius: 5, background: 'linear-gradient(90deg, oklch(0.73 0.13 245), oklch(0.73 0.13 190) 28%, oklch(0.75 0.13 140) 47%, oklch(0.78 0.13 90) 63%, oklch(0.72 0.15 55) 82%, oklch(0.65 0.18 25))' }} />
      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>28°+</span>
      <div style={{ width: 1, height: 16, background: '#e3e7ed' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 14, height: 10, background: 'rgba(163,199,236,0.88)', border: '1.5px solid #64789a', borderRadius: 2 }} />
        <span>window</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 10, height: 12, background: '#b98e5e', border: '1.5px solid #8f6a42', borderRadius: 2 }} />
        <span>door</span>
      </div>
      <div style={{ width: 1, height: 16, background: '#e3e7ed' }} />
      <span>Steady-state temperatures with heaters at set output — tune powers and outside temperature to test your setup.</span>
    </footer>
  )
}
