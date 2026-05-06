import { useState, useRef, useCallback, useMemo } from 'react'
import { Rnd } from 'react-rnd'

const CELL = 40
const COLS = 14
const ROWS = 11
const CANVAS_W = COLS * CELL
const CANVAS_H = ROWS * CELL

const ROOM_COLORS = {
  bedroom:  { bg: 'rgba(100,120,200,0.20)', border: '#6478C8', label: '#8A9EE8' },
  bathroom: { bg: 'rgba(60,160,160,0.20)',  border: '#3CA0A0', label: '#5ACACA' },
  kitchen:  { bg: 'rgba(212,146,10,0.22)',  border: '#D4920A', label: '#E8A828' },
  living:   { bg: 'rgba(180,130,60,0.20)',  border: '#B48230', label: '#D4A050' },
  dining:   { bg: 'rgba(90,128,96,0.20)',   border: '#5A8060', label: '#7AAA80' },
  hallway:  { bg: 'rgba(84,84,80,0.28)',    border: '#545450', label: '#888884' },
  other:    { bg: 'rgba(140,100,160,0.20)', border: '#8C64A0', label: '#AA88C0' },
}

const DEFAULT_SIZES = {
  bedroom: { w: 3, h: 3 }, bathroom: { w: 2, h: 2 },
  kitchen: { w: 3, h: 2 }, living:   { w: 4, h: 3 },
  dining:  { w: 3, h: 2 }, hallway:  { w: 2, h: 4 },
  other:   { w: 2, h: 2 },
}

const OTHER_TYPE_MAP = {
  'Dining Room': 'dining', 'Office': 'other', 'Laundry': 'other',
  'Storage': 'other', 'Garage': 'other', 'Basement': 'other',
}

function buildPalette(rd) {
  const items = []
  const push = (type, name, count) => {
    const n = parseInt(count) || 0
    for (let i = 0; i < n; i++) {
      items.push({ id: `pal-${type}-${i}`, type, name: n > 1 ? `${name} ${i + 1}` : name })
    }
  }
  push('bedroom',  'Bedroom',     rd?.bedrooms  || 0)
  push('bathroom', 'Bathroom',    rd?.bathrooms || 0)
  push('kitchen',  'Kitchen',     rd?.kitchen   || 0)
  push('living',   'Living Room', rd?.living    || 0)
  for (const other of (rd?.otherRooms || [])) {
    items.push({ id: `pal-other-${other}`, type: OTHER_TYPE_MAP[other] || 'other', name: other })
  }
  items.push({ id: 'pal-hallway-0', type: 'hallway', name: 'Hallway' })
  return items
}

// ─── Automatic layout generator ──────────────────────────────────────────────
function generateDummyLayout(rd) {
  const rooms = []
  let n = 0
  const nextId = () => `auto${++n}`

  const beds   = parseInt(rd?.bedrooms)  || 0
  const baths  = parseInt(rd?.bathrooms) || 0
  const kits   = parseInt(rd?.kitchen)   || 0
  const livs   = parseInt(rd?.living)    || 0
  const others = rd?.otherRooms || []
  const hasDining   = others.includes('Dining Room')
  const otherExtras = others.filter(o => o !== 'Dining Room')

  // ── Top public zone (y = 0, height = 3) ──────────────────────────────────────
  let topX = 0
  const TOP_H = 3

  for (let i = 0; i < livs; i++) {
    rooms.push({
      id: nextId(), type: 'living',
      name: livs > 1 ? `Living Room ${i + 1}` : 'Living Room',
      x: topX, y: 0, w: 4, h: TOP_H,
      doors:   [{ wall: 'south', pos: 0.5,  hinge: 'left' }],
      windows: [{ wall: 'north', pos: 0.35, size: 0.4 }, { wall: 'north', pos: 0.72, size: 0.22 }],
    })
    topX += 4
  }
  for (let i = 0; i < kits; i++) {
    rooms.push({
      id: nextId(), type: 'kitchen',
      name: kits > 1 ? `Kitchen ${i + 1}` : 'Kitchen',
      x: topX, y: 0, w: 3, h: TOP_H,
      doors:   [{ wall: 'south', pos: 0.5, hinge: 'right' }],
      windows: [{ wall: 'north', pos: 0.5, size: 0.4 }],
    })
    topX += 3
  }
  if (hasDining && topX + 3 <= COLS) {
    rooms.push({
      id: nextId(), type: 'dining', name: 'Dining Room',
      x: topX, y: 0, w: 3, h: TOP_H,
      doors:   [{ wall: 'south', pos: 0.5, hinge: 'left' }],
      windows: [{ wall: 'north', pos: 0.5, size: 0.3 }],
    })
    topX += 3
  }

  // ── Bottom private zone (y = TOP_H + 1) ──────────────────────────────────────
  let botX = 0
  let botY = 0

  const hasTop    = topX > 0
  const hasBottom = beds + baths + otherExtras.length > 0

  if (hasTop && hasBottom) {
    // Hallway connecting the two zones
    const hallW = Math.min(COLS, Math.max(topX, beds * 3 + baths * 2, 6))
    rooms.push({
      id: nextId(), type: 'hallway', name: 'Hallway',
      x: 0, y: TOP_H, w: hallW, h: 1,
      doors: [], windows: [],
    })
    botY = TOP_H + 1
  }

  for (let i = 0; i < beds; i++) {
    if (botX + 3 > COLS) { botX = 0; botY += 3 }
    rooms.push({
      id: nextId(), type: 'bedroom',
      name: beds > 1 ? `Bedroom ${i + 1}` : 'Bedroom',
      x: botX, y: botY, w: 3, h: 3,
      doors:   [{ wall: 'north', pos: 0.5, hinge: 'left' }],
      windows: [{ wall: 'south', pos: 0.5, size: 0.4 }],
    })
    botX += 3
  }
  for (let i = 0; i < baths; i++) {
    if (botX + 2 > COLS) { botX = 0; botY += 3 }
    rooms.push({
      id: nextId(), type: 'bathroom',
      name: baths > 1 ? `Bathroom ${i + 1}` : 'Bathroom',
      x: botX, y: botY, w: 2, h: 2,
      doors:   [{ wall: 'north', pos: 0.5, hinge: 'left' }],
      windows: [],
    })
    botX += 2
  }
  for (const name of otherExtras) {
    if (botX + 2 > COLS) { botX = 0; botY += 3 }
    rooms.push({
      id: nextId(), type: OTHER_TYPE_MAP[name] || 'other', name,
      x: botX, y: botY, w: 2, h: 2,
      doors:   [{ wall: 'north', pos: 0.5, hinge: 'left' }],
      windows: [],
    })
    botX += 2
  }

  return rooms
}

function markerPos(wall, pos, pw, ph) {
  if (wall === 'north') return { x: pos * pw, y: 0 }
  if (wall === 'south') return { x: pos * pw, y: ph }
  if (wall === 'west')  return { x: 0,        y: pos * ph }
  if (wall === 'east')  return { x: pw,        y: pos * ph }
  return { x: pw / 2, y: ph / 2 }
}

// ─── Room block on canvas ─────────────────────────────────────────────────────
function RoomBlock({ room, isSelected, featureMode, onSelect, onUpdate, onAddFeature, onRemoveFeature }) {
  const col    = ROOM_COLORS[room.type] || ROOM_COLORS.other
  const px     = room.x * CELL
  const py     = room.y * CELL
  const pw     = room.w * CELL
  const ph     = room.h * CELL
  const HIT    = 14
  const fColor = featureMode === 'door' ? 'rgba(212,146,10,0.22)' : 'rgba(60,160,160,0.22)'

  function wallClickNS(e, side) {
    e.stopPropagation()
    if (!featureMode) return
    onAddFeature(side, Math.max(0.1, Math.min(0.9, e.nativeEvent.offsetX / pw)))
  }
  function wallClickEW(e, side) {
    e.stopPropagation()
    if (!featureMode) return
    onAddFeature(side, Math.max(0.1, Math.min(0.9, e.nativeEvent.offsetY / ph)))
  }

  const fs = Math.min(10, Math.max(7, Math.min(pw, ph) / 5.5))

  return (
    <Rnd
      position={{ x: px, y: py }}
      size={{ width: pw, height: ph }}
      dragGrid={[CELL, CELL]}
      resizeGrid={[CELL, CELL]}
      minWidth={CELL * 2} minHeight={CELL * 2}
      maxWidth={CELL * COLS} maxHeight={CELL * ROWS}
      bounds="parent"
      onDragStop={(_, d) => onUpdate({ x: Math.round(d.x / CELL), y: Math.round(d.y / CELL) })}
      onResizeStop={(_, __, ref, ___, pos) => onUpdate({
        x: Math.round(pos.x / CELL), y: Math.round(pos.y / CELL),
        w: Math.round(ref.offsetWidth / CELL), h: Math.round(ref.offsetHeight / CELL),
      })}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      style={{ zIndex: isSelected ? 10 : 2 }}
    >
      {/* Fill + border */}
      <div style={{
        position: 'absolute', inset: 0, boxSizing: 'border-box',
        background: col.bg,
        border: `${isSelected ? 2 : 1.5}px solid ${isSelected ? col.border : col.border + '77'}`,
        outline: isSelected ? `2px solid ${col.border}33` : 'none',
        outlineOffset: 2, borderRadius: 1, pointerEvents: 'none',
      }} />

      {/* Label */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'ui-monospace, monospace', fontSize: fs, fontWeight: 700,
          color: col.label, letterSpacing: '0.06em', textTransform: 'uppercase',
          textAlign: 'center', padding: '0 4px', lineHeight: 1.3,
        }}>
          {room.name}
        </span>
      </div>

      {/* Wall hit zones (only when selected + featureMode active) */}
      {isSelected && featureMode && (<>
        <div onClick={(e) => wallClickNS(e, 'north')} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HIT, cursor: 'crosshair', zIndex: 20, background: fColor }} />
        <div onClick={(e) => wallClickNS(e, 'south')} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: HIT, cursor: 'crosshair', zIndex: 20, background: fColor }} />
        <div onClick={(e) => wallClickEW(e, 'west')}  style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: HIT, cursor: 'crosshair', zIndex: 20, background: fColor }} />
        <div onClick={(e) => wallClickEW(e, 'east')}  style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: HIT, cursor: 'crosshair', zIndex: 20, background: fColor }} />
      </>)}

      {/* Door markers */}
      {room.doors.map((d, i) => {
        const { x: mx, y: my } = markerPos(d.wall, d.pos, pw, ph)
        return (
          <div key={`d${i}`}
            onClick={(e) => { e.stopPropagation(); onRemoveFeature('door', i) }}
            title="Click to remove"
            style={{
              position: 'absolute', left: mx - 7, top: my - 7, width: 14, height: 14, zIndex: 30,
              background: '#D4920A', border: '1.5px solid #E8A828', borderRadius: 3, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'ui-monospace, monospace', fontSize: 7, fontWeight: 700, color: '#0B0A08',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >D</div>
        )
      })}

      {/* Window markers */}
      {room.windows.map((w, i) => {
        const { x: mx, y: my } = markerPos(w.wall, w.pos, pw, ph)
        return (
          <div key={`w${i}`}
            onClick={(e) => { e.stopPropagation(); onRemoveFeature('window', i) }}
            title="Click to remove"
            style={{
              position: 'absolute', left: mx - 7, top: my - 7, width: 14, height: 14, zIndex: 30,
              background: '#3CA0A0', border: '1.5px solid #5ACACA', borderRadius: 3, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'ui-monospace, monospace', fontSize: 7, fontWeight: 700, color: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >W</div>
        )
      })}
    </Rnd>
  )
}

// ─── Main mapper ──────────────────────────────────────────────────────────────
export default function FloorPlanMapper({ roomDetails, onDone }) {
  const initialPalette  = useMemo(() => buildPalette(roomDetails), [])
  const [palette, setPalette]           = useState(initialPalette)
  const [rooms, setRooms]               = useState([])
  const [selectedId, setSelectedId]     = useState(null)
  const [featureMode, setFeatureMode]   = useState(null) // 'door' | 'window' | null
  const [draggingItem, setDraggingItem] = useState(null)
  const [idCounter, setIdCounter]       = useState(1)
  const canvasRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (!draggingItem || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const sz = DEFAULT_SIZES[draggingItem.type] || { w: 2, h: 2 }
    const gx = Math.max(0, Math.min(COLS - sz.w, Math.round((e.clientX - rect.left  - sz.w * CELL / 2) / CELL)))
    const gy = Math.max(0, Math.min(ROWS - sz.h, Math.round((e.clientY - rect.top   - sz.h * CELL / 2) / CELL)))
    setRooms(prev => [...prev, {
      id: `r${idCounter}`, paletteId: draggingItem.id,
      type: draggingItem.type, name: draggingItem.name,
      x: gx, y: gy, w: sz.w, h: sz.h, doors: [], windows: [],
    }])
    setPalette(prev => prev.filter(p => p.id !== draggingItem.id))
    setIdCounter(c => c + 1)
    setDraggingItem(null)
  }, [draggingItem, idCounter])

  const handleRoomUpdate = useCallback((id, updates) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }, [])

  const handleRoomDelete = useCallback((id) => {
    setRooms(prev => {
      const room = prev.find(r => r.id === id)
      if (room) {
        const palItem = initialPalette.find(p => p.id === room.paletteId)
        if (palItem) setPalette(pp => [...pp, palItem])
      }
      return prev.filter(r => r.id !== id)
    })
    setSelectedId(s => s === id ? null : s)
    setFeatureMode(null)
  }, [initialPalette])

  const handleAddFeature = useCallback((roomId, wall, pos) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r
      if (featureMode === 'door')   return { ...r, doors:   [...r.doors,   { wall, pos, hinge: 'left' }] }
      if (featureMode === 'window') return { ...r, windows: [...r.windows, { wall, pos, size: 0.28 }] }
      return r
    }))
  }, [featureMode])

  const handleRemoveFeature = useCallback((roomId, ftype, idx) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r
      if (ftype === 'door')   return { ...r, doors:   r.doors.filter((_, i) => i !== idx) }
      return { ...r, windows: r.windows.filter((_, i) => i !== idx) }
    }))
  }, [])

  const handleGenerateDummy = useCallback(() => {
    const generated = generateDummyLayout(roomDetails)
    const usedPalIds = new Set()

    const mapped = generated.map(room => {
      // Match palette item by type+name first, then type only
      const palItem =
        initialPalette.find(p => p.type === room.type && p.name === room.name && !usedPalIds.has(p.id)) ||
        initialPalette.find(p => p.type === room.type && !usedPalIds.has(p.id))
      if (palItem) usedPalIds.add(palItem.id)
      return { ...room, paletteId: palItem?.id ?? null }
    })

    setRooms(mapped)
    setPalette(initialPalette.filter(p => !usedPalIds.has(p.id)))
    setIdCounter(generated.length + 1)
    setSelectedId(null)
    setFeatureMode(null)
  }, [roomDetails, initialPalette])

  const handleDone = useCallback(() => {
    onDone({
      rooms: rooms.map(({ id, name, type, x, y, w, h, doors, windows }) =>
        ({ id, name, type, x, y, w, h, doors, windows })
      ),
      totalW: COLS, totalH: ROWS,
    })
  }, [rooms, onDone])

  const selectedRoom = rooms.find(r => r.id === selectedId)
  const selCol       = selectedRoom ? (ROOM_COLORS[selectedRoom.type] || ROOM_COLORS.other) : null

  return (
    <div style={{ display: 'flex', gap: 14, userSelect: 'none', alignItems: 'flex-start' }}>

      {/* ── Palette ── */}
      <div style={{ width: 158, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, letterSpacing: '0.14em', color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>
          ROOM PALETTE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
          {palette.length === 0 ? (
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 9, color: '#3a3a38', fontStyle: 'italic', lineHeight: 1.6 }}>
              All rooms placed
            </div>
          ) : palette.map(item => {
            const col = ROOM_COLORS[item.type] || ROOM_COLORS.other
            return (
              <div key={item.id}
                draggable
                onDragStart={() => setDraggingItem(item)}
                style={{
                  padding: '7px 9px',
                  background: col.bg,
                  border: `1px solid ${col.border}66`,
                  borderRadius: 6, cursor: 'grab',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 8, fontWeight: 700,
                  color: col.label, letterSpacing: '0.07em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'border-color 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = col.border}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${col.border}66`}
              >
                <span style={{ fontSize: 9, opacity: 0.7 }}>⠿</span>
                {item.name}
              </div>
            )
          })}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>HOW TO USE</div>
          {[
            ['⠿', 'Drag room to canvas'],
            ['↔', 'Drag to reposition'],
            ['⤡', 'Drag corner to resize'],
            ['D', 'Add Door → click wall'],
            ['W', 'Add Window → click wall'],
            ['×', 'Click marker to remove'],
          ].map(([icon, tip]) => (
            <div key={tip} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: '#3a3020', width: 10, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 9, color: '#3a3a38', lineHeight: 1.4 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Canvas column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Toolbar row */}
        <div style={{ height: 26, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {selectedRoom ? (<>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: selCol.label, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ◆ {selectedRoom.name}
            </span>
            <div style={{ width: 1, height: 14, background: '#2a2a28' }} />
            {['door', 'window'].map(mode => (
              <button key={mode}
                onClick={() => setFeatureMode(f => f === mode ? null : mode)}
                style={{
                  padding: '3px 10px',
                  background: featureMode === mode ? `${selCol.border}20` : 'transparent',
                  border: `1px solid ${featureMode === mode ? selCol.border : '#2e2e2c'}`,
                  borderRadius: 4, fontSize: 7, fontFamily: 'ui-monospace, monospace',
                  letterSpacing: '0.1em', color: featureMode === mode ? selCol.label : '#444',
                  cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.12s',
                }}
              >+ {mode}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => handleRoomDelete(selectedId)} style={{
              padding: '3px 9px', background: 'transparent',
              border: '1px solid #2a1010', borderRadius: 4, fontSize: 7,
              fontFamily: 'ui-monospace, monospace', letterSpacing: '0.08em',
              color: '#6a2828', cursor: 'pointer', textTransform: 'uppercase',
            }}>Delete</button>
            <button onClick={() => { setSelectedId(null); setFeatureMode(null) }} style={{
              width: 20, height: 20, background: 'transparent', border: '1px solid #2a2a28',
              borderRadius: 3, color: '#3a3a38', cursor: 'pointer', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace',
            }}>×</button>
          </>) : (
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, color: '#2e2e2c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {rooms.length > 0 ? 'Click a room to select · Add doors & windows' : 'Drag rooms from the palette to start'}
            </span>
          )}
        </div>

        {/* Feature mode hint */}
        {featureMode && (
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, color: '#C4820A', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
            ↕ Click on any highlighted wall edge to place {featureMode}
          </div>
        )}

        {/* Grid canvas */}
        <div
          ref={canvasRef}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={(e) => {
            if (e.target === canvasRef.current) { setSelectedId(null); setFeatureMode(null) }
          }}
          style={{
            position: 'relative', flexShrink: 0,
            width: CANVAS_W, height: CANVAS_H,
            background: '#0B0A08',
            backgroundImage: `
              linear-gradient(rgba(84,84,80,0.09) 1px, transparent 1px),
              linear-gradient(90deg, rgba(84,84,80,0.09) 1px, transparent 1px)
            `,
            backgroundSize: `${CELL}px ${CELL}px`,
            border: '1px solid rgba(212,146,10,0.15)',
            borderRadius: 4, overflow: 'visible',
          }}
        >
          {rooms.map(room => (
            <RoomBlock
              key={room.id}
              room={room}
              isSelected={selectedId === room.id}
              featureMode={selectedId === room.id ? featureMode : null}
              onSelect={() => { setSelectedId(room.id); setFeatureMode(null) }}
              onUpdate={(u) => handleRoomUpdate(room.id, u)}
              onAddFeature={(wall, pos) => handleAddFeature(room.id, wall, pos)}
              onRemoveFeature={(ft, i) => handleRemoveFeature(room.id, ft, i)}
            />
          ))}
          {rooms.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <div style={{ width: 48, height: 48, border: '1px dashed #1e1e1c', borderRadius: 6 }} />
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: '#1e1e1c', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Drag rooms here
              </span>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, color: '#2e2e2c', letterSpacing: '0.06em' }}>
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} placed · {COLS}×{ROWS} grid
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Generate dummy plan */}
            <button
              onClick={handleGenerateDummy}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid #3a3020',
                borderRadius: 7,
                fontFamily: 'ui-monospace, monospace', fontSize: 9,
                letterSpacing: '0.12em', fontWeight: 600,
                color: '#C4820A',
                cursor: 'pointer',
                textTransform: 'uppercase', transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4920A'; e.currentTarget.style.color = '#E8A828' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3020'; e.currentTarget.style.color = '#C4820A' }}
              title="Auto-arrange rooms based on your room counts"
            >
              ⚡ Auto Layout
            </button>

            {/* Preview */}
            <button
              disabled={rooms.length === 0}
              onClick={handleDone}
              style={{
                padding: '8px 20px',
                background: rooms.length > 0 ? '#D4920A' : '#161614',
                border: 'none', borderRadius: 7,
                fontFamily: 'ui-monospace, monospace', fontSize: 9,
                letterSpacing: '0.16em', fontWeight: 700,
                color: rooms.length > 0 ? '#0B0A08' : '#2a2a28',
                cursor: rooms.length > 0 ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase', transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { if (rooms.length > 0) { e.currentTarget.style.background = '#E8A828'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { if (rooms.length > 0) { e.currentTarget.style.background = '#D4920A'; e.currentTarget.style.transform = 'translateY(0)' } }}
            >
              Preview Floor Plan →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
