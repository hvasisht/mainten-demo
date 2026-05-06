import { useMemo } from 'react'
import { colors } from '../tokens'

function buildingToSvgPath(feature, w, h, padding = 24) {
  if (!feature?.geometry) return null
  const geom = feature.geometry
  const rings = geom.type === 'Polygon' ? geom.coordinates
    : geom.type === 'MultiPolygon' ? geom.coordinates.flat()
    : null
  if (!rings) return null

  const allPts = rings.flat()
  const xs = allPts.map(p => p[0])
  const ys = allPts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const scale = Math.min((w - padding * 2) / rangeX, (h - padding * 2) / rangeY)

  const toSvg = ([lng, lat]) => [
    padding + (lng - minX) * scale,
    h - padding - (lat - minY) * scale,
  ]

  return rings.map(ring =>
    'M ' + ring.map(p => toSvg(p).join(',') ).join(' L ') + ' Z'
  ).join(' ')
}

export default function FloorPlanPanel({ building, visible }) {
  const W = 220, H = 200
  const path = useMemo(() => buildingToSvgPath(building, W, H), [building])

  return (
    <div style={{
      position: 'absolute',
      bottom: 32,
      left: 32,
      width: W + 40,
      borderRadius: 12,
      overflow: 'hidden',
      background: 'rgba(20,18,14,0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1.5px solid ${colors.gunmetal}`,
      boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      zIndex: 10,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      pointerEvents: 'none',
    }}>
      <div style={{ height: 3, background: colors.amber }} />
      <div style={{ padding: '10px 14px 4px' }}>
        <div style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 9,
          letterSpacing: '0.12em',
          color: colors.amber,
          textTransform: 'uppercase',
        }}>
          Building Footprint
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px 14px' }}>
        {path ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <rect width={W} height={H} fill="#1a1810" rx="4" />
            {/* Grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={`h${i}`} x1={24} y1={24 + i * ((H - 48) / 4)} x2={W - 24} y2={24 + i * ((H - 48) / 4)}
                stroke={colors.gunmetal} strokeWidth="0.4" strokeDasharray="3,4" opacity="0.4" />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={`v${i}`} x1={24 + i * ((W - 48) / 4)} y1={24} x2={24 + i * ((W - 48) / 4)} y2={H - 24}
                stroke={colors.gunmetal} strokeWidth="0.4" strokeDasharray="3,4" opacity="0.4" />
            ))}
            {/* Building fill */}
            <path d={path} fill={`${colors.amber}22`} stroke={colors.amber} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Compass */}
            <text x={W - 18} y={18} fill={colors.amber} fontSize="9" fontFamily="monospace" opacity="0.6">N</text>
            <line x1={W - 15} y1={20} x2={W - 15} y2={28} stroke={colors.amber} strokeWidth="1" opacity="0.5" />
          </svg>
        ) : (
          <div style={{
            width: W, height: H,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 10, color: colors.gunmetal, letterSpacing: '0.08em',
          }}>
            NO FOOTPRINT DATA
          </div>
        )}
      </div>
    </div>
  )
}
