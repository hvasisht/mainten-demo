import { useState, useRef } from 'react'
import { colors } from '../tokens'
import FloorPlanSVG from './FloorPlanSVG'

// ──────────────────────────────────────────────────────────────
//  ELEMENTS — each represents a system/area to chat about
// ──────────────────────────────────────────────────────────────
export const ELEMENTS = [
  {
    id: 'boiler',
    name: 'Boiler / Heating',
    icon: '🌡',
    context: 'Steam boiler in basement utility room. Cast iron boiler serving all three floors via two-pipe steam radiator system.',
    riskLevel: 'monitor',
  },
  {
    id: 'electrical',
    name: 'Electrical Panel',
    icon: '⚡',
    context: 'Main electrical service panel in basement. May have been upgraded but original knob-and-tube wiring likely remains in wall cavities throughout.',
    riskLevel: 'risk',
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: '🔧',
    context: 'Kitchen with drain stack running through all three floors. Supply lines likely original galvanised iron. Shared plumbing chase connects all three kitchens vertically.',
    riskLevel: 'risk',
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: '🚿',
    context: 'Bathroom above kitchen on each floor. Cast iron drain stack original. Check for evidence of past water infiltration to floor below.',
    riskLevel: 'monitor',
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: '🛏',
    context: 'Bedroom with plaster-over-lath walls. Lead paint assumed present on all original surfaces. Balloon frame — no fire blocking in wall cavities.',
    riskLevel: 'monitor',
  },
  {
    id: 'living',
    name: 'Living Room',
    icon: '🏠',
    context: 'Load-bearing balloon frame front wall. Continuous wall cavity from foundation to roof with no fire blocking. Plaster over lath interior finish.',
    riskLevel: 'info',
  },
  {
    id: 'roof',
    name: 'Roof',
    icon: '☁',
    context: 'Flat or low-slope roof typical of Boston triple-decker. Modified bitumen or tar-and-gravel system. Check permit history for last replacement.',
    riskLevel: 'monitor',
  },
]

const RISK_COLORS = {
  risk:    colors.riskOrange,
  monitor: colors.amber,
  info:    '#5A8060',
}

// ──────────────────────────────────────────────────────────────
//  ROOM DEFINITIONS — each maps to an element
// ──────────────────────────────────────────────────────────────
const ROOMS = [
  // Floor 3 (y: 80–170)
  { id: 'f3_living',  label: 'LIVING',   icon: '🏠', x: 20,  y: 80,  w: 110, h: 45, elementId: 'living'    },
  { id: 'f3_bed',     label: 'BEDROOM',  icon: '🛏', x: 20,  y: 125, w: 110, h: 45, elementId: 'bedroom'   },
  { id: 'f3_kitchen', label: 'KITCHEN',  icon: '🔧', x: 130, y: 80,  w: 110, h: 45, elementId: 'kitchen'   },
  { id: 'f3_bath',    label: 'BATHROOM', icon: '🚿', x: 130, y: 125, w: 110, h: 45, elementId: 'bathroom'  },
  // Floor 2 (y: 170–260)
  { id: 'f2_living',  label: 'LIVING',   icon: '🏠', x: 20,  y: 170, w: 110, h: 45, elementId: 'living'    },
  { id: 'f2_bed',     label: 'BEDROOM',  icon: '🛏', x: 20,  y: 215, w: 110, h: 45, elementId: 'bedroom'   },
  { id: 'f2_kitchen', label: 'KITCHEN',  icon: '🔧', x: 130, y: 170, w: 110, h: 45, elementId: 'kitchen'   },
  { id: 'f2_bath',    label: 'BATHROOM', icon: '🚿', x: 130, y: 215, w: 110, h: 45, elementId: 'bathroom'  },
  // Floor 1 (y: 260–350)
  { id: 'f1_living',  label: 'LIVING',   icon: '🏠', x: 20,  y: 260, w: 110, h: 45, elementId: 'living'    },
  { id: 'f1_bed',     label: 'BEDROOM',  icon: '🛏', x: 20,  y: 305, w: 110, h: 45, elementId: 'bedroom'   },
  { id: 'f1_kitchen', label: 'KITCHEN',  icon: '🔧', x: 130, y: 260, w: 110, h: 45, elementId: 'kitchen'   },
  { id: 'f1_bath',    label: 'BATHROOM', icon: '🚿', x: 130, y: 305, w: 110, h: 45, elementId: 'bathroom'  },
  // Basement (y: 350–420)
  { id: 'b_boiler',   label: 'BOILER',   icon: '🌡', x: 20,  y: 350, w: 105, h: 60, elementId: 'boiler'    },
  { id: 'b_electric', label: 'ELECTRIC', icon: '⚡', x: 130, y: 350, w: 110, h: 60, elementId: 'electrical'},
]

const FLOOR_LABELS = [
  { label: '3F', y: 125 },
  { label: '2F', y: 215 },
  { label: '1F', y: 305 },
  { label: 'B',  y: 380 },
]

// Parse floor number from profile.floor string like "2", "Unit 2", "2nd floor", "Floor 2"
function parseUserFloor(floorStr) {
  if (!floorStr) return null
  const m = floorStr.match(/\d+/)
  const n = m ? parseInt(m[0]) : null
  if (!n || n < 1 || n > 3) return null
  return n
}

// Room type → element id mapping for custom floor plans
const ROOM_TYPE_TO_ELEMENT = {
  bedroom: 'bedroom', bathroom: 'bathroom',
  kitchen: 'kitchen', living: 'living', dining: 'living',
}

// Element id → room types that should light up
const ELEMENT_TO_ROOM_TYPES = {
  bedroom: ['bedroom'], bathroom: ['bathroom'],
  kitchen: ['kitchen'], living: ['living', 'dining'],
}

export default function TripleDeckerMap({ address, propertyData, activeElement, onElementClick, userProfile }) {
  const [hoveredRoom, setHoveredRoom] = useState(null)
  const svgContainerRef = useRef(null)
  const tripleDeckerRef = useRef(null)

  const yearBuilt = propertyData?.assessor?.yearBuilt || '1914'
  const units = propertyData?.units?.count || 3

  // If tenant specified their floor, highlight only that floor
  const userFloor = parseUserFloor(userProfile?.floor)

  // Custom floor plan from onboarding mapper
  const customFloorPlan = userProfile?.floorPlan

  function getElement(id) {
    return ELEMENTS.find(e => e.id === id)
  }

  function roomColor(room) {
    const el = getElement(room.elementId)
    return RISK_COLORS[el?.riskLevel] || colors.gunmetal
  }

  function isActive(room) {
    return activeElement?.id === room.elementId
  }

  // Returns true if this room is on the user's floor (or basement, always accessible)
  function isUserFloor(room) {
    if (!userFloor) return true // no filter set
    if (room.id.startsWith('b_')) return true // basement always shown
    const floorMap = { f3: 3, f2: 2, f1: 1 }
    const prefix = room.id.slice(0, 2)
    return floorMap[prefix] === userFloor
  }

  function roomFill(room) {
    const c = roomColor(room)
    const dimmed = !isUserFloor(room)
    if (isActive(room))           return `${c}2a`
    if (hoveredRoom === room.id)  return `${c}18`
    if (dimmed)                   return `${c}04`
    return `${c}08`
  }

  function roomStroke(room) {
    const c = roomColor(room)
    const dimmed = !isUserFloor(room)
    if (isActive(room))           return c
    if (hoveredRoom === room.id)  return `${c}99`
    if (dimmed)                   return `${c}18`
    return `${c}33`
  }

  function roomStrokeWidth(room) {
    return isActive(room) ? 1.5 : 0.8
  }

  function roomLabelOpacity(room) {
    if (!userFloor) return 1
    if (room.id.startsWith('b_')) return 1
    return isUserFloor(room) ? 1 : 0.25
  }

  // ── Custom floor plan view ──────────────────────────────────────────────────
  if (customFloorPlan) {
    const activeRoomTypes = ELEMENT_TO_ROOM_TYPES[activeElement?.id] || []

    // Use coordinate-math click handling on a div wrapper — bypasses SVG pointer-event quirks
    function handleSVGContainerClick(e) {
      const container = svgContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const CELL = 52, PAD = 24
      const svgW = (customFloorPlan.totalW || 14) * CELL + PAD * 2
      const svgH = (customFloorPlan.totalH || 11) * CELL + PAD * 2
      const scaleX = svgW / rect.width
      const scaleY = svgH / rect.height
      const svgX = (e.clientX - rect.left) * scaleX
      const svgY = (e.clientY - rect.top) * scaleY
      const clicked = customFloorPlan.rooms.find(room => {
        const rx = PAD + room.x * CELL
        const ry = PAD + room.y * CELL
        return svgX >= rx && svgX <= rx + room.w * CELL && svgY >= ry && svgY <= ry + room.h * CELL
      })
      if (!clicked) return
      const elemId = ROOM_TYPE_TO_ELEMENT[clicked.type]
      if (!elemId) return
      const el = ELEMENTS.find(x => x.id === elemId)
      if (el) onElementClick(el, e.clientY)
    }

    return (
      <div>
        {/* Header */}
        <div style={{
          background: 'rgba(14,13,11,0.90)', backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1.5px solid ${colors.gunmetal}`, borderBottom: 'none',
          borderRadius: '12px 12px 0 0', padding: '10px 14px 8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9, letterSpacing: '0.14em', color: colors.amber, textTransform: 'uppercase' }}>
              House Map
            </div>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: 'rgba(245,240,232,0.5)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {address?.split(',')[0]}
          </div>
        </div>

        {/* Floor plan SVG — click handled via coordinate math on the wrapper div */}
        <div
          ref={svgContainerRef}
          onClick={handleSVGContainerClick}
          style={{
            background: 'rgba(12,11,10,0.95)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1.5px solid ${colors.gunmetal}`,
            borderTop: `1px solid ${colors.gunmetal}22`, borderBottom: 'none',
            cursor: 'pointer',
          }}
        >
          <FloorPlanSVG
            floorPlan={customFloorPlan}
            activeRoomTypes={activeRoomTypes}
          />
        </div>

        {/* Footer — issue counts */}
        <div style={{
          background: 'rgba(14,13,11,0.90)', backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1.5px solid ${colors.gunmetal}`,
          borderTop: `1px solid ${colors.gunmetal}22`,
          borderRadius: '0 0 12px 12px',
          padding: '8px 14px 10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: `${colors.gunmetal}66`, letterSpacing: '0.08em' }}>
            TAP ANY ROOM TO CHAT
          </span>
          <IssueBadge count={0} />
        </div>
      </div>
    )
  }

  // ── Triple-decker fallback view ─────────────────────────────────────────────
  return (
    <div style={{ width: 400, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'rgba(14,13,11,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.5px solid ${colors.gunmetal}`,
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        padding: '10px 14px 8px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9, letterSpacing: '0.14em', color: colors.amber, textTransform: 'uppercase' }}>
            House Map
          </div>
          <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 8, letterSpacing: '0.08em', color: colors.gunmetal }}>
            Built {yearBuilt} · {units === 1 ? '1 unit' : `${units} units`}
          </div>
        </div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: 'rgba(245,240,232,0.5)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {address?.split(',')[0]}
        </div>
      </div>

      {/* ── SVG Floor Plan ── */}
      <div
        ref={tripleDeckerRef}
        onClick={(e) => {
          const container = tripleDeckerRef.current
          if (!container) return
          const rect = container.getBoundingClientRect()
          const scaleX = 260 / rect.width
          const scaleY = 440 / rect.height
          const sx = (e.clientX - rect.left) * scaleX
          const sy = (e.clientY - rect.top) * scaleY
          const hit = ROOMS.find(r => sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h)
          if (hit) { onElementClick(getElement(hit.elementId), e.clientY); return }
          if (sx >= 20 && sx <= 240 && sy >= 20 && sy <= 80) onElementClick(getElement('roof'), e.clientY)
        }}
        onMouseMove={(e) => {
          const container = tripleDeckerRef.current
          if (!container) return
          const rect = container.getBoundingClientRect()
          const scaleX = 260 / rect.width
          const scaleY = 440 / rect.height
          const sx = (e.clientX - rect.left) * scaleX
          const sy = (e.clientY - rect.top) * scaleY
          const hit = ROOMS.find(r => sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h)
          setHoveredRoom(hit?.id || (sx >= 20 && sx <= 240 && sy >= 20 && sy <= 80 ? 'roof' : null))
        }}
        onMouseLeave={() => setHoveredRoom(null)}
        style={{
          background: 'rgba(12,11,10,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1.5px solid ${colors.gunmetal}`,
          borderTop: `1px solid ${colors.gunmetal}22`,
          borderBottom: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width="100%" viewBox="0 0 260 440" style={{ display: 'block', pointerEvents: 'none' }}>

          <rect width="260" height="440" fill="#0b0a09" />

          {/* ── Clickable Rooms ── */}
          {ROOMS.map(room => {
            const active = isActive(room)
            const hovered = hoveredRoom === room.id
            const color = roomColor(room)
            const labelY = room.y + room.h / 2 - (active || hovered ? 5 : 3)
            return (
              <g
                key={room.id}
                onClick={(e) => onElementClick(getElement(room.elementId), e.clientY)}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                style={{ cursor: 'pointer', opacity: roomLabelOpacity(room) }}
                pointerEvents="all"
              >
                <rect
                  x={room.x} y={room.y} width={room.w} height={room.h}
                  fill={roomFill(room)}
                  stroke={roomStroke(room)}
                  strokeWidth={roomStrokeWidth(room)}
                  rx={2}
                  pointerEvents="all"
                  style={{ transition: 'fill 0.15s, stroke 0.15s' }}
                />
                {/* Room icon + label */}
                <text
                  x={room.x + room.w / 2}
                  y={labelY}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: active ? 7.5 : 7,
                    fill: active ? color : hovered ? `${color}cc` : `${colors.gunmetal}bb`,
                    letterSpacing: '0.08em',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {room.icon} {room.label}
                </text>
                {/* Sub-hint */}
                <text
                  x={room.x + room.w / 2}
                  y={labelY + 10}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 6,
                    fill: active ? `${color}bb` : hovered ? `${color}88` : 'transparent',
                    letterSpacing: '0.05em',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {active ? '● CHATTING' : 'tap to chat'}
                </text>
              </g>
            )
          })}

          {/* ── Roof (clickable) ── */}
          <g
            onClick={(e) => onElementClick(getElement('roof'), e.clientY)}
            onMouseEnter={() => setHoveredRoom('roof')}
            onMouseLeave={() => setHoveredRoom(null)}
            style={{ cursor: 'pointer' }}
            pointerEvents="all"
          >
            <polygon
              points="20,80 130,20 240,80"
              fill={activeElement?.id === 'roof' ? `${colors.amber}28` : hoveredRoom === 'roof' ? `${colors.amber}18` : `${colors.amber}0a`}
              stroke={activeElement?.id === 'roof' ? colors.amber : hoveredRoom === 'roof' ? `${colors.amber}88` : `${colors.amber}44`}
              strokeWidth={activeElement?.id === 'roof' ? 1.5 : 1}
              pointerEvents="all"
              style={{ transition: 'fill 0.15s, stroke 0.15s' }}
            />
            <text x={130} y={56} textAnchor="middle" style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 7.5,
              fill: activeElement?.id === 'roof' ? colors.amber : hoveredRoom === 'roof' ? `${colors.amber}cc` : `${colors.gunmetal}bb`,
              letterSpacing: '0.1em', userSelect: 'none', pointerEvents: 'none',
            }}>☁ ROOF</text>
            <text x={130} y={66} textAnchor="middle" style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 6,
              fill: activeElement?.id === 'roof' ? `${colors.amber}bb` : hoveredRoom === 'roof' ? `${colors.amber}88` : 'transparent',
              letterSpacing: '0.05em', userSelect: 'none', pointerEvents: 'none',
            }}>{activeElement?.id === 'roof' ? '● CHATTING' : 'tap to chat'}</text>
          </g>

          {/* ── Structural lines (drawn OVER rooms so they're visible) ── */}
          {/* Outer building border per floor */}
          {[80, 170, 260].map(y => (
            <rect key={y} x={20} y={y} width={220} height={90}
              fill="none"
              stroke={`${colors.amber}44`}
              strokeWidth={1}
              pointerEvents="none"
            />
          ))}
          {/* Basement border */}
          <rect x={20} y={350} width={220} height={70}
            fill="none"
            stroke={`${colors.gunmetal}66`}
            strokeWidth={0.8}
            strokeDasharray="4,3"
            pointerEvents="none"
          />
          {/* Center wall divider */}
          <line x1={130} y1={80} x2={130} y2={350}
            stroke={`${colors.gunmetal}55`} strokeWidth={0.8} pointerEvents="none" />
          {/* Horizontal floor dividers */}
          <line x1={20} y1={170} x2={240} y2={170}
            stroke={`${colors.gunmetal}55`} strokeWidth={0.8} pointerEvents="none" />
          <line x1={20} y1={260} x2={240} y2={260}
            stroke={`${colors.gunmetal}55`} strokeWidth={0.8} pointerEvents="none" />
          {/* Mid-floor dividers */}
          <line x1={20} y1={125} x2={130} y2={125}
            stroke={`${colors.gunmetal}33`} strokeWidth={0.5} strokeDasharray="3,3" pointerEvents="none" />
          <line x1={130} y1={125} x2={240} y2={125}
            stroke={`${colors.gunmetal}33`} strokeWidth={0.5} strokeDasharray="3,3" pointerEvents="none" />
          <line x1={20} y1={215} x2={240} y2={215}
            stroke={`${colors.gunmetal}33`} strokeWidth={0.5} strokeDasharray="3,3" pointerEvents="none" />
          <line x1={20} y1={305} x2={240} y2={305}
            stroke={`${colors.gunmetal}33`} strokeWidth={0.5} strokeDasharray="3,3" pointerEvents="none" />
          {/* Basement divider */}
          <line x1={130} y1={350} x2={130} y2={420}
            stroke={`${colors.gunmetal}33`} strokeWidth={0.5} strokeDasharray="3,3" pointerEvents="none" />

          {/* ── Plumbing stack ── */}
          <rect x={153} y={80} width={6} height={270}
            fill={`${colors.amber}10`} stroke={`${colors.amber}30`} strokeWidth={0.5} strokeDasharray="2,4"
            pointerEvents="none"
          />
          <text x={156} y={77} textAnchor="middle" style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 6, fill: `${colors.amber}55`,
            userSelect: 'none', pointerEvents: 'none',
          }}>↕ STACK</text>

          {/* ── Floor labels ── */}
          {FLOOR_LABELS.map(f => {
            const floorNum = f.label === '3F' ? 3 : f.label === '2F' ? 2 : f.label === '1F' ? 1 : null
            const isMyFloor = userFloor && floorNum === userFloor
            return (
              <g key={f.label}>
                <text x={8} y={f.y} textAnchor="middle"
                  transform={`rotate(-90,8,${f.y})`}
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: isMyFloor ? colors.amber : `${colors.amber}77`, letterSpacing: '0.12em', userSelect: 'none', pointerEvents: 'none' }}>
                  {f.label}
                </text>
                {isMyFloor && (
                  <text x={252} y={f.y - 6} textAnchor="end"
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: 5.5, fill: `${colors.amber}cc`, letterSpacing: '0.08em', userSelect: 'none', pointerEvents: 'none' }}>
                    YOUR UNIT
                  </text>
                )}
              </g>
            )
          })}

          {/* ── Compass ── */}
          <text x={236} y={28} textAnchor="middle" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, fill: `${colors.amber}88`, userSelect: 'none', pointerEvents: 'none' }}>N</text>
          <line x1={236} y1={31} x2={236} y2={37} stroke={colors.amber} strokeWidth={1} opacity={0.5} pointerEvents="none" />

        </svg>
      </div>

      {/* ── Footer — issue counts ── */}
      <div style={{
        background: 'rgba(14,13,11,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.5px solid ${colors.gunmetal}`,
        borderTop: `1px solid ${colors.gunmetal}22`,
        borderRadius: '0 0 12px 12px',
        padding: '8px 14px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: `${colors.gunmetal}66`, letterSpacing: '0.08em' }}>
          TAP ANY AREA TO CHAT
        </span>
        <IssueBadge count={0} />
      </div>
    </div>
  )
}

function IssueBadge({ count }) {
  const hasIssues = count > 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: hasIssues ? `${colors.riskOrange}18` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${hasIssues ? colors.riskOrange + '55' : colors.gunmetal + '44'}`,
      borderRadius: 8, padding: '3px 9px',
    }}>
      <span style={{
        fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700,
        color: hasIssues ? colors.riskOrange : colors.gunmetal,
        lineHeight: 1,
      }}>
        {count}
      </span>
      <span style={{
        fontFamily: 'ui-monospace, monospace', fontSize: 7, letterSpacing: '0.1em',
        color: hasIssues ? colors.riskOrange : colors.gunmetal,
        textTransform: 'uppercase',
      }}>
        {count === 1 ? 'issue' : 'issues'}
      </span>
    </div>
  )
}
