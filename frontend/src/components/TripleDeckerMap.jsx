import { useState, useEffect } from 'react'
import { colors } from '../tokens'

// ──────────────────────────────────────────────────────────────
//  Six elements placed on the triple-decker floor plan
// ──────────────────────────────────────────────────────────────
export const ELEMENTS = [
  {
    id: 'boiler',
    name: 'Boiler / Heating',
    icon: '🌡',
    cx: 72, cy: 378,   // basement utility
    context: 'Steam boiler in basement utility room. Original or replacement cast iron boiler serving all three floors via two-pipe steam radiator system. Pipes run through chase in party wall.',
    riskLevel: 'monitor',
  },
  {
    id: 'electrical',
    name: 'Electrical Panel',
    icon: '⚡',
    cx: 130, cy: 378,  // basement, near boiler
    context: 'Main electrical service panel in basement. May have been upgraded (200A service common in renovated units) but original knob-and-tube wiring likely remains in wall cavities throughout the building.',
    riskLevel: 'risk',
  },
  {
    id: 'kitchen',
    name: 'Kitchen Sink / Pipes',
    icon: '🔧',
    cx: 80, cy: 250,   // ground floor kitchen (rear)
    context: 'Kitchen sink with drain stack running through all three floors. Supply lines likely original galvanised iron. Shared plumbing chase connects all three kitchens vertically.',
    riskLevel: 'risk',
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: '🚿',
    cx: 160, cy: 170,  // second floor bathroom
    context: 'Second floor bathroom directly above ground floor bathroom. Cast iron drain stack (original). Tile and fixtures likely renovated. Check for evidence of past water infiltration to floor below.',
    riskLevel: 'monitor',
  },
  {
    id: 'frontwall',
    name: 'Front Wall',
    icon: '🏠',
    cx: 190, cy: 260,  // living room, street-facing
    context: 'Load-bearing balloon frame front wall. Continuous wall cavity from foundation to roof with no fire blocking — standard 1914 construction. Plaster over lath interior finish. Street-facing exposure.',
    riskLevel: 'info',
  },
  {
    id: 'roof',
    name: 'Roof Access',
    icon: '☁',
    cx: 120, cy: 58,   // top — roof stairwell
    context: 'Roof access hatch at top of stairwell. Flat or low-slope roof typical of Boston triple-decker. Modified bitumen or tar-and-gravel system. Check permit history for last replacement date.',
    riskLevel: 'monitor',
  },
]

const RISK_COLORS = {
  risk:    colors.riskOrange,
  monitor: colors.amber,
  info:    '#5A8060',
}

function PulsingMarker({ cx, cy, color, active, onClick, label, icon }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Pulse rings */}
      {!active && (
        <>
          <circle cx={cx} cy={cy} r={14} fill="none" stroke={color} strokeWidth={1} opacity={0.25}
            style={{ animation: `markerPulse ${2 + (cx % 3) * 0.4}s ease-out infinite` }} />
          <circle cx={cx} cy={cy} r={9} fill="none" stroke={color} strokeWidth={1} opacity={0.4}
            style={{ animation: `markerPulse ${2 + (cx % 3) * 0.4}s ease-out infinite 0.4s` }} />
        </>
      )}
      {/* Solid dot */}
      <circle cx={cx} cy={cy} r={active ? 10 : 7}
        fill={active ? color : `${color}33`}
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        style={{ transition: 'r 0.2s, fill 0.2s' }}
      />
      {/* Icon */}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: active ? 9 : 8, userSelect: 'none', pointerEvents: 'none' }}>
        {icon}
      </text>
      {/* Active glow */}
      {active && (
        <circle cx={cx} cy={cy} r={14}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.5}
        />
      )}
    </g>
  )
}

export default function TripleDeckerMap({ address, propertyData, activeElement, onElementClick, visible }) {
  const yearBuilt = propertyData?.assessor?.yearBuilt || '1914'
  const luDesc = propertyData?.assessor?.luDesc || 'Three-decker'
  const units = propertyData?.units?.count || 3

  return (
    <div style={{
      position: 'absolute',
      left: 40,
      top: '50%',
      transform: visible ? 'translateY(-50%)' : 'translateY(calc(-50% + 20px))',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      pointerEvents: visible ? 'all' : 'none',
      zIndex: 10,
      width: 280,
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(14,13,11,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.5px solid ${colors.gunmetal}`,
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        padding: '10px 14px 6px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 9, letterSpacing: '0.14em',
            color: colors.amber, textTransform: 'uppercase',
          }}>
            House Map
          </div>
          <div style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 8, letterSpacing: '0.08em', color: colors.gunmetal,
          }}>
            Built {yearBuilt} · {units === 1 ? '1 unit' : `${units} units`}
          </div>
        </div>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 11,
          color: 'rgba(245,240,232,0.5)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {address?.split(',')[0]}
        </div>
      </div>

      {/* SVG floor plan */}
      <div style={{
        background: 'rgba(14,13,11,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.5px solid ${colors.gunmetal}`,
        borderTop: `1px solid ${colors.gunmetal}33`,
        borderBottom: 'none',
      }}>
        <svg
          width="280" height="440"
          viewBox="0 0 260 440"
          style={{ display: 'block' }}
        >
          <defs>
            <style>{`
              @keyframes markerPulse {
                0%   { r: 7px; opacity: 0.5; }
                60%  { r: 18px; opacity: 0; }
                100% { r: 18px; opacity: 0; }
              }
            `}</style>
          </defs>

          {/* Background */}
          <rect width="260" height="440" fill="#0b0a09" />

          {/* Grid */}
          {[80, 160, 240, 320].map(y => (
            <line key={y} x1={20} y1={y} x2={240} y2={y}
              stroke={colors.gunmetal} strokeWidth={0.3} strokeDasharray="3,5" opacity={0.3} />
          ))}
          {[65, 130, 195].map(x => (
            <line key={x} x1={x} y1={20} x2={x} y2={420}
              stroke={colors.gunmetal} strokeWidth={0.3} strokeDasharray="3,5" opacity={0.3} />
          ))}

          {/* ─── ROOF ─── */}
          <g opacity={0.9}>
            <polygon points="20,80 130,20 240,80" fill={`${colors.amber}18`} stroke={colors.amber} strokeWidth={1.2} />
            <line x1={130} y1={20} x2={130} y2={80}
              stroke={colors.gunmetal} strokeWidth={0.8} strokeDasharray="2,3" opacity={0.5} />
            <text x={130} y={58} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'cc', letterSpacing: '0.1em' }}>
              ROOF
            </text>
          </g>

          {/* ─── FLOOR 3 ─── */}
          <g>
            <rect x={20} y={80} width={220} height={90} fill={`${colors.amber}08`} stroke={colors.amber} strokeWidth={1} />
            {/* Interior walls */}
            <line x1={130} y1={80} x2={130} y2={170} stroke={colors.gunmetal} strokeWidth={0.8} opacity={0.5} />
            <line x1={20} y1={125} x2={130} y2={125} stroke={colors.gunmetal} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.35} />
            {/* Room labels */}
            <text x={75} y={107} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              LIVING
            </text>
            <text x={75} y={145} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              BED 1
            </text>
            <text x={185} y={121} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              KIT / BATH
            </text>
            {/* Floor label */}
            <text x={8} y={128} textAnchor="middle" transform="rotate(-90,8,128)"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.amber + '88', letterSpacing: '0.12em' }}>
              3F
            </text>
          </g>

          {/* ─── FLOOR 2 ─── */}
          <g>
            <rect x={20} y={170} width={220} height={90} fill={`${colors.amber}06`} stroke={colors.amber} strokeWidth={1} />
            <line x1={130} y1={170} x2={130} y2={260} stroke={colors.gunmetal} strokeWidth={0.8} opacity={0.5} />
            <line x1={20} y1={215} x2={130} y2={215} stroke={colors.gunmetal} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.35} />
            <line x1={130} y1={215} x2={240} y2={215} stroke={colors.gunmetal} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.35} />
            <text x={75} y={197} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              LIVING
            </text>
            <text x={75} y={235} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              BED 1
            </text>
            <text x={185} y={200} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              KITCHEN
            </text>
            <text x={185} y={235} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              BATHROOM
            </text>
            <text x={8} y={218} textAnchor="middle" transform="rotate(-90,8,218)"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.amber + '88', letterSpacing: '0.12em' }}>
              2F
            </text>
          </g>

          {/* ─── FLOOR 1 ─── */}
          <g>
            <rect x={20} y={260} width={220} height={90} fill={`${colors.amber}05`} stroke={colors.amber} strokeWidth={1} />
            <line x1={130} y1={260} x2={130} y2={350} stroke={colors.gunmetal} strokeWidth={0.8} opacity={0.5} />
            <line x1={20} y1={305} x2={130} y2={305} stroke={colors.gunmetal} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.35} />
            <text x={75} y={287} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              LIVING
            </text>
            <text x={75} y={325} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              BED 1
            </text>
            <text x={185} y={302} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'bb', letterSpacing: '0.08em' }}>
              KITCHEN
            </text>
            <text x={8} y={308} textAnchor="middle" transform="rotate(-90,8,308)"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.amber + '88', letterSpacing: '0.12em' }}>
              1F
            </text>
          </g>

          {/* ─── BASEMENT ─── */}
          <g>
            <rect x={20} y={350} width={220} height={60} fill={`${colors.amber}04`} stroke={colors.gunmetal} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.7} />
            <text x={130} y={384} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + 'aa', letterSpacing: '0.12em' }}>
              BASEMENT · UTILITY
            </text>
            <text x={8} y={380} textAnchor="middle" transform="rotate(-90,8,380)"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: colors.gunmetal + '66', letterSpacing: '0.12em' }}>
              B
            </text>
          </g>

          {/* ─── PLUMBING CHASE (vertical stack indicator) ─── */}
          <rect x={152} y={80} width={8} height={270}
            fill={`${colors.amber}15`} stroke={`${colors.amber}44`} strokeWidth={0.5}
            strokeDasharray="2,3"
          />
          <text x={156} y={78} textAnchor="middle"
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 6, fill: colors.amber + '66', letterSpacing: '0.05em' }}>
            ↕ STACK
          </text>

          {/* ─── STAIR INDICATOR ─── */}
          {[80, 170, 260].map(y => (
            <g key={y}>
              <rect x={108} y={y} width={22} height={12} fill="none" stroke={colors.gunmetal} strokeWidth={0.5} opacity={0.4} />
              <line x1={108} y1={y + 4} x2={130} y2={y + 4} stroke={colors.gunmetal} strokeWidth={0.4} opacity={0.3} />
              <line x1={108} y1={y + 8} x2={130} y2={y + 8} stroke={colors.gunmetal} strokeWidth={0.4} opacity={0.3} />
            </g>
          ))}

          {/* ─── COMPASS ─── */}
          <g transform="translate(235, 28)">
            <text x={0} y={0} textAnchor="middle"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, fill: colors.amber + '88' }}>N</text>
            <line x1={0} y1={3} x2={0} y2={10} stroke={colors.amber} strokeWidth={1} opacity={0.5} />
          </g>

          {/* ─── ELEMENT MARKERS ─── */}
          {ELEMENTS.map(el => (
            <PulsingMarker
              key={el.id}
              cx={el.cx}
              cy={el.cy}
              color={RISK_COLORS[el.riskLevel]}
              active={activeElement?.id === el.id}
              onClick={() => onElementClick(el)}
              label={el.name}
              icon={el.icon}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        background: 'rgba(14,13,11,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.5px solid ${colors.gunmetal}`,
        borderTop: `1px solid ${colors.gunmetal}33`,
        borderRadius: '0 0 12px 12px',
        padding: '8px 14px 10px',
        display: 'flex', flexWrap: 'wrap', gap: '4px 14px',
      }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: colors.gunmetal + 'aa', letterSpacing: '0.08em' }}>TAP ANY ELEMENT TO EXPLORE</span>
        {[
          { color: colors.riskOrange, label: 'Risk' },
          { color: colors.amber, label: 'Monitor' },
          { color: '#5A8060', label: 'Clear' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: colors.gunmetal, letterSpacing: '0.06em' }}>{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
