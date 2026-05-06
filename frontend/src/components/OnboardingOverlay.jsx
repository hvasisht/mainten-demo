import { useState } from 'react'
import { colors } from '../tokens'
import FloorPlanSVG from './FloorPlanSVG'
import FloorPlanMapper from './FloorPlanMapper'

const ROLES = [
  { id: 'tenant', label: 'I am a Tenant', desc: 'Renting this property', icon: '🔑' },
  { id: 'owner',  label: 'I am an Owner',  desc: 'I own this property',   icon: '🏠' },
  { id: 'both',   label: 'I am Both',      desc: 'Owner-occupier',        icon: '⚖' },
]

const OTHER_ROOMS = ['Dining Room', 'Office', 'Laundry', 'Storage', 'Garage', 'Basement']

function generateHouseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `MTN-${seg(4)}-${seg(4)}`
}

export default function OnboardingOverlay({ address, visible, onComplete }) {
  // ── Core state
  const [role, setRole]       = useState(null)
  const [step, setStep]       = useState('role') // role | details | housekey | roomdetails | mapper | floorplan
  const [moveIn, setMoveIn]   = useState('')
  const [leaseEnd, setLeaseEnd] = useState('')
  const [floor, setFloor]     = useState('')
  const [occupants, setOccupants] = useState('')
  const [houseKey, setHouseKey] = useState('')
  const [copied, setCopied]   = useState(false)

  // ── Room details
  const [bedrooms, setBedrooms]     = useState('2')
  const [bathrooms, setBathrooms]   = useState('1')
  const [kitchen, setKitchen]       = useState('1')
  const [living, setLiving]         = useState('1')
  const [otherRooms, setOtherRooms] = useState([])

  // ── Floor plan
  const [floorPlan, setFloorPlan]   = useState(null)

  // ── Handlers
  function handleRoleSelect(r) { setRole(r); setStep('details') }

  function handleDetailsNext() {
    const key = generateHouseKey()
    setHouseKey(key)
    setStep('housekey')
  }

  function handleEnterFromKey() { setStep('roomdetails') }

  function handleShare() {
    navigator.clipboard.writeText(`House Key: ${houseKey}\nAddress: ${address}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  function toggleOther(name) {
    setOtherRooms(prev => prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name])
  }

  function handleRoomDetailsNext() { setStep('mapper') }

  function handleMapperDone(fp) {
    setFloorPlan(fp)
    setStep('floorplan')
  }

  function handleEditMap() {
    setFloorPlan(null)
    setStep('mapper')
  }

  function handleFinalEnter() {
    onComplete?.({ role: role.id, moveIn, leaseEnd, floor, occupants, houseKey, floorPlan })
  }

  const isMapper   = step === 'mapper'
  const isFloorPlan = step === 'floorplan'

  // ── Render
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: isMapper ? 880 : isFloorPlan ? 560 : 420,
        margin: '0 24px',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(14,13,11,0.97)',
        border: `1.5px solid ${colors.gunmetal}`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${colors.amber}22`,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), max-width 0.35s ease',
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ height: 3, background: `linear-gradient(to right, ${colors.amber}, ${colors.amberBright})`, flexShrink: 0 }} />

        <div style={{ padding: isMapper ? '18px 20px 20px' : '24px 24px 28px', overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>

          {/* Logo + address (hidden on mapper and floorplan steps) */}
          {!isMapper && !isFloorPlan && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.24em', color: colors.amber, textTransform: 'uppercase', marginBottom: 6 }}>MAINTEN</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: colors.warmWhite, lineHeight: 1.35 }}>{address?.split(',')[0]}</div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: colors.gunmetal, marginTop: 3, letterSpacing: '0.05em' }}>
                {address?.split(',').slice(1).join(',').trim()}
              </div>
            </div>
          )}

          {/* ── ROLE ── */}
          {step === 'role' && (
            <>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: 'rgba(245,240,232,0.7)', marginBottom: 18, lineHeight: 1.5 }}>
                What is your relationship to this property?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => handleRoleSelect(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${colors.gunmetal}`,
                      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${colors.amber}88`; e.currentTarget.style.background = `${colors.amber}0c` }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.gunmetal; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: colors.warmWhite, lineHeight: 1.2 }}>{r.label}</div>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: colors.gunmetal, letterSpacing: '0.06em', marginTop: 3 }}>{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── DETAILS ── */}
          {step === 'details' && (
            <>
              <BackBtn onClick={() => setStep('role')} label={`${role?.icon} ${role?.label}`} />
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: 'rgba(245,240,232,0.6)', marginBottom: 18, lineHeight: 1.5 }}>
                A few quick details to personalise your house profile.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Move-in date" type="date" value={moveIn} onChange={setMoveIn} placeholder="When did you move in?" />
                {role?.id === 'tenant' && (
                  <Field label="Lease end date (optional)" type="date" value={leaseEnd} onChange={setLeaseEnd} placeholder="When does your lease end?" />
                )}
                <Field label="Unit / Floor" value={floor} onChange={setFloor} placeholder="e.g. Unit 2, 2nd floor" />
                <Field label="Number of occupants" type="number" value={occupants} onChange={setOccupants} placeholder="How many people live here?" min="1" max="20" />
              </div>
              <PrimaryBtn onClick={handleDetailsNext} style={{ marginTop: 20 }}>Open My House Profile</PrimaryBtn>
              <Hint>Fields are optional — you can complete your profile later</Hint>
            </>
          )}

          {/* ── HOUSE KEY ── */}
          {step === 'housekey' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.18em', color: colors.amber, textTransform: 'uppercase', marginBottom: 14 }}>
                  Your House Key
                </div>
                <div style={{
                  fontFamily: 'ui-monospace, Consolas, monospace',
                  fontSize: 26, fontWeight: 700, letterSpacing: '0.22em',
                  color: colors.warmWhite,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${colors.amber}66`,
                  borderRadius: 12, padding: '18px 24px',
                  display: 'inline-block',
                  boxShadow: `0 0 30px ${colors.amber}22`,
                }}>
                  {houseKey}
                </div>
                <div style={{ marginTop: 12, fontFamily: 'Georgia, serif', fontSize: 12, color: 'rgba(245,240,232,0.5)', lineHeight: 1.5 }}>
                  This key uniquely identifies your home profile.<br />Save it — you can use it to return or share access.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleShare}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${copied ? colors.amber : colors.gunmetal}`,
                    borderRadius: 12, padding: '13px 0',
                    fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: copied ? colors.amber : colors.warmWhite, cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (!copied) e.currentTarget.style.borderColor = colors.amber }}
                  onMouseLeave={e => { if (!copied) e.currentTarget.style.borderColor = colors.gunmetal }}
                >
                  {copied ? '✓ Copied' : 'Share'}
                </button>
                <PrimaryBtn onClick={handleEnterFromKey} style={{ flex: 2 }}>Enter</PrimaryBtn>
              </div>
            </>
          )}

          {/* ── ROOM DETAILS ── */}
          {step === 'roomdetails' && (
            <>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.16em', color: colors.amber, textTransform: 'uppercase', marginBottom: 6 }}>
                Step 1 of 2
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: colors.warmWhite, marginBottom: 4 }}>Tell us about your home</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: 'rgba(245,240,232,0.5)', marginBottom: 20, lineHeight: 1.5 }}>
                We'll use this to pre-fill the floor plan mapper in the next step.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <CountField label="Bedrooms"     value={bedrooms}  onChange={setBedrooms} />
                <CountField label="Bathrooms"    value={bathrooms} onChange={setBathrooms} />
                <CountField label="Kitchens"     value={kitchen}   onChange={setKitchen} />
                <CountField label="Living Rooms" value={living}    onChange={setLiving} />
              </div>

              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.1em', color: colors.gunmetal, textTransform: 'uppercase', marginBottom: 8 }}>
                Other rooms (optional)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
                {OTHER_ROOMS.map(name => (
                  <button key={name} onClick={() => toggleOther(name)}
                    style={{
                      background: otherRooms.includes(name) ? `${colors.amber}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${otherRooms.includes(name) ? colors.amber : colors.gunmetal}`,
                      borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                      fontFamily: 'Georgia, serif', fontSize: 11,
                      color: otherRooms.includes(name) ? colors.amber : 'rgba(245,240,232,0.6)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <PrimaryBtn onClick={handleRoomDetailsNext}>Next — Map Your Home</PrimaryBtn>
            </>
          )}

          {/* ── MAPPER ── */}
          {step === 'mapper' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, letterSpacing: '0.2em', color: colors.amber, textTransform: 'uppercase' }}>MAINTEN</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: colors.warmWhite, lineHeight: 1.2, marginTop: 2 }}>{address?.split(',')[0]}</div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, letterSpacing: '0.14em', color: colors.gunmetal, textTransform: 'uppercase' }}>
                  Step 2 of 2 — Floor Plan Mapper
                </div>
              </div>
              <FloorPlanMapper
                roomDetails={{ bedrooms, bathrooms, kitchen, living, otherRooms }}
                onDone={handleMapperDone}
              />
            </>
          )}

          {/* ── FLOOR PLAN PREVIEW ── */}
          {step === 'floorplan' && floorPlan && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.2em', color: colors.amber, textTransform: 'uppercase', marginBottom: 4 }}>MAINTEN</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: colors.warmWhite }}>{address?.split(',')[0]}</div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: colors.gunmetal, marginTop: 3, letterSpacing: '0.05em' }}>2D Floor Plan</div>
              </div>

              <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.amber}33`, marginBottom: 16, boxShadow: `0 0 40px ${colors.amber}11` }}>
                <FloorPlanSVG floorPlan={floorPlan} />
              </div>

              {/* Room legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 18 }}>
                {floorPlan.rooms.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: LEGEND_COLORS[r.type] || '#888888', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: colors.gunmetal, letterSpacing: '0.06em' }}>{r.name}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleEditMap}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${colors.gunmetal}`,
                    borderRadius: 12, padding: '13px 0', cursor: 'pointer',
                    fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: colors.gunmetal, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = colors.amber; e.currentTarget.style.color = colors.amber }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = colors.gunmetal; e.currentTarget.style.color = colors.gunmetal }}
                >
                  ← Edit Map
                </button>
                <PrimaryBtn onClick={handleFinalEnter} style={{ flex: 2 }}>Enter My Home</PrimaryBtn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const LEGEND_COLORS = {
  bedroom: '#6478C8', bathroom: '#3CA0A0', kitchen: '#D4920A',
  living:  '#B48230', dining:   '#5A8060', hallway:  '#545450', other: '#8C64A0',
}

function BackBtn({ onClick, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.amber, fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.1em', padding: 0 }}>
        ← BACK
      </button>
      <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: colors.warmWhite }}>{label}</span>
    </div>
  )
}

function PrimaryBtn({ onClick, children, style = {}, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{
        width: '100%', background: colors.amber, color: colors.carbon,
        border: 'none', borderRadius: 12, padding: '14px 0',
        fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer',
        boxShadow: `0 4px 20px ${colors.amber}44`,
        transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = colors.amberBright; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { e.currentTarget.style.background = colors.amber; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {children}
    </button>
  )
}

function Hint({ children }) {
  return (
    <div style={{ marginTop: 12, textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 8, color: colors.gunmetal, letterSpacing: '0.05em' }}>
      {children}
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, min, max }) {
  return (
    <div>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.1em', color: colors.gunmetal, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.gunmetal}`,
          borderRadius: 8, padding: '10px 12px', fontFamily: 'Georgia, serif', fontSize: 13,
          color: colors.warmWhite, outline: 'none', caretColor: colors.amber,
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.currentTarget.style.borderColor = colors.amber}
        onBlur={e => e.currentTarget.style.borderColor = colors.gunmetal}
      />
    </div>
  )
}

function CountField({ label, value, onChange }) {
  const n = parseInt(value) || 0
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.gunmetal}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, letterSpacing: '0.1em', color: colors.gunmetal, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
        <button onClick={() => onChange(String(Math.max(0, n - 1)))}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.gunmetal}`, color: colors.warmWhite, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = colors.amber}
          onMouseLeave={e => e.currentTarget.style.borderColor = colors.gunmetal}
        >−</button>
        <span style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 20, fontWeight: 700, color: colors.warmWhite, minWidth: 20, textAlign: 'center' }}>{n}</span>
        <button onClick={() => onChange(String(n + 1))}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.gunmetal}`, color: colors.warmWhite, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = colors.amber}
          onMouseLeave={e => e.currentTarget.style.borderColor = colors.gunmetal}
        >+</button>
      </div>
    </div>
  )
}
