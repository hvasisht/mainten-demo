import { useState, useEffect } from 'react'
import { colors } from '../tokens'

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

export default function StreetViewCard({ location, address }) {
  const [visible, setVisible] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (!location) { setVisible(false); setImgError(false); return }
    // Slide in after map flight lands
    const t = setTimeout(() => setVisible(true), 2600)
    return () => clearTimeout(t)
  }, [location])

  if (!location || !GOOGLE_KEY || GOOGLE_KEY === 'PASTE_YOUR_GOOGLE_KEY_HERE') return null

  const src = `https://maps.googleapis.com/maps/api/streetview?size=480x280&location=${location.lat},${location.lng}&fov=90&pitch=5&key=${GOOGLE_KEY}`

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        right: 32,
        width: 280,
        borderRadius: 12,
        overflow: 'hidden',
        background: colors.cityMid,
        border: `1.5px solid ${colors.gunmetal}`,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        zIndex: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        pointerEvents: visible ? 'all' : 'none',
      }}
    >
      {/* Amber top accent */}
      <div style={{ height: 3, background: colors.amber }} />

      {imgError ? (
        <div style={{
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 10,
          color: colors.gunmetal,
          letterSpacing: '0.08em',
        }}>
          NO STREET VIEW AVAILABLE
        </div>
      ) : (
        <img
          src={src}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
          alt="Street view"
        />
      )}

      {/* Address label */}
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 9,
          letterSpacing: '0.12em',
          color: colors.amber,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          Street View
        </div>
        <div style={{
          fontFamily: 'Georgia, serif',
          fontSize: 12,
          color: colors.warmWhite,
          lineHeight: 1.4,
          opacity: 0.8,
        }}>
          {address}
        </div>
      </div>
    </div>
  )
}
