import { useState } from 'react'

const ROOM_STYLES = {
  bedroom:  { fill: 'rgba(100,120,200,0.18)', stroke: '#6478C8', label: '#8A9EE8' },
  bathroom: { fill: 'rgba(60,160,160,0.18)',  stroke: '#3CA0A0', label: '#5ACACA' },
  kitchen:  { fill: 'rgba(212,146,10,0.2)',   stroke: '#D4920A', label: '#E8A828' },
  living:   { fill: 'rgba(180,130,60,0.18)',  stroke: '#B48230', label: '#D4A050' },
  dining:   { fill: 'rgba(90,128,96,0.18)',   stroke: '#5A8060', label: '#7AAA80' },
  hallway:  { fill: 'rgba(84,84,80,0.25)',    stroke: '#545450', label: '#888884' },
  other:    { fill: 'rgba(140,100,160,0.18)', stroke: '#8C64A0', label: '#AA88C0' },
}

const DOOR_SIZE_FRAC = 0.62  // door width as fraction of CELL

// Architectural door symbol: panel line from hinge + quarter-circle arc
// hinge: 'left' | 'right' as seen from inside the room
function DoorSymbol({ side, rx, ry, rw, rh, pos, hinge = 'left', doorSize, color }) {
  const p = pos ?? 0.5

  if (side === 'north' || side === 'south') {
    const wallY = side === 'north' ? ry : ry + rh
    // inward direction: south wall → up (y-), north wall → down (y+)
    const inward = side === 'south' ? -1 : 1
    const tipY = wallY + inward * doorSize

    // hinge='left' means hinge is at the smaller-x end; 'right' means larger-x end
    const centerX = rx + p * rw
    const hingeX = hinge === 'left' ? centerX - doorSize / 2 : centerX + doorSize / 2
    const freeX  = hinge === 'left' ? centerX + doorSize / 2 : centerX - doorSize / 2

    // Panel: hinge point on wall → tip (perpendicular into room)
    const panelTipX = hingeX
    const panelTipY = tipY

    // Arc sweep: from panel tip back to free end of gap on wall
    // sweep=1 clockwise, sweep=0 counter-clockwise
    const sweep = (hinge === 'left' && side === 'south') || (hinge === 'right' && side === 'north') ? 1 : 0

    return (
      <path
        d={`M ${hingeX} ${wallY} L ${panelTipX} ${panelTipY} A ${doorSize} ${doorSize} 0 0 ${sweep} ${freeX} ${wallY}`}
        fill="none" stroke={color} strokeWidth={1} opacity={0.75}
      />
    )
  }

  if (side === 'west' || side === 'east') {
    const wallX = side === 'west' ? rx : rx + rw
    const inward = side === 'east' ? -1 : 1
    const tipX = wallX + inward * doorSize

    const centerY = ry + p * rh
    const hingeY = hinge === 'left' ? centerY - doorSize / 2 : centerY + doorSize / 2
    const freeY  = hinge === 'left' ? centerY + doorSize / 2 : centerY - doorSize / 2

    const sweep = (hinge === 'left' && side === 'east') || (hinge === 'right' && side === 'west') ? 0 : 1

    return (
      <path
        d={`M ${wallX} ${hingeY} L ${tipX} ${hingeY} A ${doorSize} ${doorSize} 0 0 ${sweep} ${wallX} ${freeY}`}
        fill="none" stroke={color} strokeWidth={1} opacity={0.75}
      />
    )
  }
  return null
}

// Architectural window symbol: gap in wall + double glass line
function WindowSymbol({ side, rx, ry, rw, rh, pos, size, wallStroke, WALL }) {
  const p = pos ?? 0.5
  const sz = size ?? 0.25
  const glassGap = WALL * 1.2

  if (side === 'north' || side === 'south') {
    const wallY = side === 'north' ? ry : ry + rh
    const halfW = (sz * rw) / 2
    const cx = rx + p * rw
    const x1 = cx - halfW, x2 = cx + halfW
    return (
      <g>
        <line x1={x1} y1={wallY - glassGap} x2={x2} y2={wallY - glassGap}
          stroke={wallStroke} strokeWidth={1} opacity={0.7} />
        <line x1={x1} y1={wallY + glassGap} x2={x2} y2={wallY + glassGap}
          stroke={wallStroke} strokeWidth={1} opacity={0.7} />
      </g>
    )
  }

  if (side === 'west' || side === 'east') {
    const wallX = side === 'west' ? rx : rx + rw
    const halfH = (sz * rh) / 2
    const cy = ry + p * rh
    const y1 = cy - halfH, y2 = cy + halfH
    return (
      <g>
        <line x1={wallX - glassGap} y1={y1} x2={wallX - glassGap} y2={y2}
          stroke={wallStroke} strokeWidth={1} opacity={0.7} />
        <line x1={wallX + glassGap} y1={y1} x2={wallX + glassGap} y2={y2}
          stroke={wallStroke} strokeWidth={1} opacity={0.7} />
      </g>
    )
  }
  return null
}

export default function FloorPlanSVG({ floorPlan, style, onRoomClick, activeRoomTypes = [] }) {
  const [hoveredId, setHoveredId] = useState(null)
  if (!floorPlan?.rooms?.length) return null

  const CELL = 52
  const PAD  = 24
  const WALL = 2.5
  const totalW = floorPlan.totalW || 12
  const totalH = floorPlan.totalH || 10
  const svgW = totalW * CELL + PAD * 2
  const svgH = totalH * CELL + PAD * 2
  const DOOR_SIZE = CELL * DOOR_SIZE_FRAC

  const st = (type) => ROOM_STYLES[type] || ROOM_STYLES.other
  const toX = (x) => PAD + x * CELL
  const toY = (y) => PAD + y * CELL

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block', ...style }}>
      <rect x={0} y={0} width={svgW} height={svgH} fill="#0E0D0B" />

      {/* Grid */}
      {Array.from({ length: totalW + 1 }, (_, i) => (
        <line key={`gv${i}`} x1={toX(i)} y1={PAD} x2={toX(i)} y2={PAD + totalH * CELL}
          stroke="rgba(84,84,80,0.1)" strokeWidth={0.5} />
      ))}
      {Array.from({ length: totalH + 1 }, (_, i) => (
        <line key={`gh${i}`} x1={PAD} y1={toY(i)} x2={PAD + totalW * CELL} y2={toY(i)}
          stroke="rgba(84,84,80,0.1)" strokeWidth={0.5} />
      ))}

      {floorPlan.rooms.map(room => {
        const s = st(room.type)
        const rx = toX(room.x), ry = toY(room.y)
        const rw = room.w * CELL, rh = room.h * CELL
        const cx = rx + rw / 2, cy = ry + rh / 2
        const fontSize = Math.min(11, Math.max(7, Math.min(rw, rh) / 4.5))
        const doors = room.doors || []
        const windows = room.windows || []
        const isActive  = activeRoomTypes.includes(room.type)
        const isHovered = hoveredId === room.id && !!onRoomClick
        const clickable = !!onRoomClick

        return (
          <g
            key={room.id}
            onClick={clickable ? (e) => onRoomClick(room, e) : undefined}
            onMouseEnter={clickable ? () => setHoveredId(room.id) : undefined}
            onMouseLeave={clickable ? () => setHoveredId(null) : undefined}
            style={clickable ? { cursor: 'pointer' } : {}}
            pointerEvents={clickable ? "all" : undefined}
          >
            {/* Room fill */}
            <rect x={rx} y={ry} width={rw} height={rh} fill={s.fill} pointerEvents={clickable ? "all" : undefined} />
            {/* Hover / active overlay */}
            {(isHovered || isActive) && (
              <rect x={rx} y={ry} width={rw} height={rh}
                fill={isActive ? `${s.stroke}28` : `${s.stroke}14`}
                pointerEvents="none" />
            )}

            {/* Walls — each side drawn with gaps for doors and windows */}
            {(['north', 'east', 'south', 'west']).map(side => {
              const sideDoors   = doors.filter(d => d.wall === side)
              const sideWindows = windows.filter(w => w.wall === side)
              const isHoriz = side === 'north' || side === 'south'

              // Build list of gaps (doors + windows) sorted by position
              const gaps = [
                ...sideDoors.map(d => ({
                  type: 'door', pos: d.pos ?? 0.5, hinge: d.hinge || 'left',
                  halfSize: DOOR_SIZE / 2 / (isHoriz ? rw : rh),
                })),
                ...sideWindows.map(w => ({
                  type: 'window', pos: w.pos ?? 0.5,
                  halfSize: (w.size ?? 0.25) / 2,
                })),
              ].sort((a, b) => a.pos - b.pos)

              if (isHoriz) {
                const wallY = side === 'north' ? ry : ry + rh
                if (!gaps.length) return <line key={side} x1={rx} y1={wallY} x2={rx+rw} y2={wallY} stroke={s.stroke} strokeWidth={WALL} strokeLinecap="square" />

                const segments = []
                let cur = 0
                for (const g of gaps) {
                  const gL = Math.max(0, g.pos - g.halfSize)
                  const gR = Math.min(1, g.pos + g.halfSize)
                  if (cur < gL) segments.push({ x1: rx + cur * rw, x2: rx + gL * rw })
                  cur = gR
                }
                if (cur < 1) segments.push({ x1: rx + cur * rw, x2: rx + rw })

                return (
                  <g key={side}>
                    {segments.map((seg, i) => (
                      <line key={i} x1={seg.x1} y1={wallY} x2={seg.x2} y2={wallY}
                        stroke={s.stroke} strokeWidth={WALL} strokeLinecap="square" />
                    ))}
                    {sideDoors.map((d, i) => (
                      <DoorSymbol key={`d${i}`} side={side} rx={rx} ry={ry} rw={rw} rh={rh}
                        pos={d.pos ?? 0.5} hinge={d.hinge || 'left'} doorSize={DOOR_SIZE} color={s.stroke} />
                    ))}
                    {sideWindows.map((w, i) => (
                      <WindowSymbol key={`w${i}`} side={side} rx={rx} ry={ry} rw={rw} rh={rh}
                        pos={w.pos ?? 0.5} size={w.size ?? 0.25} wallStroke={s.stroke} WALL={WALL} />
                    ))}
                  </g>
                )
              } else {
                const wallX = side === 'west' ? rx : rx + rw
                if (!gaps.length) return <line key={side} x1={wallX} y1={ry} x2={wallX} y2={ry+rh} stroke={s.stroke} strokeWidth={WALL} strokeLinecap="square" />

                const segments = []
                let cur = 0
                for (const g of gaps) {
                  const gT = Math.max(0, g.pos - g.halfSize)
                  const gB = Math.min(1, g.pos + g.halfSize)
                  if (cur < gT) segments.push({ y1: ry + cur * rh, y2: ry + gT * rh })
                  cur = gB
                }
                if (cur < 1) segments.push({ y1: ry + cur * rh, y2: ry + rh })

                return (
                  <g key={side}>
                    {segments.map((seg, i) => (
                      <line key={i} x1={wallX} y1={seg.y1} x2={wallX} y2={seg.y2}
                        stroke={s.stroke} strokeWidth={WALL} strokeLinecap="square" />
                    ))}
                    {sideDoors.map((d, i) => (
                      <DoorSymbol key={`d${i}`} side={side} rx={rx} ry={ry} rw={rw} rh={rh}
                        pos={d.pos ?? 0.5} hinge={d.hinge || 'left'} doorSize={DOOR_SIZE} color={s.stroke} />
                    ))}
                    {sideWindows.map((w, i) => (
                      <WindowSymbol key={`w${i}`} side={side} rx={rx} ry={ry} rw={rw} rh={rh}
                        pos={w.pos ?? 0.5} size={w.size ?? 0.25} wallStroke={s.stroke} WALL={WALL} />
                    ))}
                  </g>
                )
              }
            })}

            {/* Room name */}
            <text x={cx} y={cy - (clickable ? fontSize * 0.8 : fontSize * 0.45)} textAnchor="middle" dominantBaseline="middle"
              fontFamily="ui-monospace, Consolas, monospace" fontSize={fontSize} fontWeight={700}
              fill={isActive ? s.stroke : s.label} letterSpacing="0.06em" style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {room.name.toUpperCase()}
            </text>

            {clickable && room.w >= 2 && room.h >= 2 && (
              <text x={cx} y={cy + fontSize * 0.65} textAnchor="middle" dominantBaseline="middle"
                fontFamily="ui-monospace, Consolas, monospace" fontSize={Math.max(5.5, fontSize - 3)}
                fill={isActive ? `${s.stroke}cc` : isHovered ? `${s.label}99` : 'transparent'}
                letterSpacing="0.05em" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                {isActive ? '● CHATTING' : 'tap to chat'}
              </text>
            )}

            {!clickable && room.w >= 3 && room.h >= 2 && (
              <text x={cx} y={cy + fontSize * 0.9} textAnchor="middle" dominantBaseline="middle"
                fontFamily="ui-monospace, Consolas, monospace" fontSize={Math.max(6, fontSize - 2)}
                fill={s.label} opacity={0.4} style={{ userSelect: 'none', pointerEvents: 'none' }}>
                {room.w}×{room.h}
              </text>
            )}
          </g>
        )
      })}

      {/* Outer border */}
      <rect x={PAD} y={PAD} width={totalW * CELL} height={totalH * CELL}
        fill="none" stroke="rgba(212,146,10,0.28)" strokeWidth={2} />

      {/* Legend */}
      <g transform={`translate(${PAD}, ${PAD + totalH * CELL + 10})`}>
        <text fontFamily="ui-monospace, monospace" fontSize={7} fill="rgba(84,84,80,0.8)" letterSpacing="0.08em">
          <tspan>━ WALL</tspan>
          <tspan dx={14}>╌ DOOR SWING</tspan>
          <tspan dx={14}>║ WINDOW</tspan>
        </text>
      </g>
    </svg>
  )
}
