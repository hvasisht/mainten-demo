import { useState } from 'react'
import { colors } from '../tokens'

const ROLES = [
  {
    id: 'tenant',
    label: 'I am a Tenant',
    desc: 'Renting this property',
    icon: '🔑',
  },
  {
    id: 'owner',
    label: 'I am an Owner',
    desc: 'I own this property',
    icon: '🏠',
  },
  {
    id: 'both',
    label: 'I am Both',
    desc: 'Owner-occupier',
    icon: '⚖',
  },
]

export default function OnboardingOverlay({ address, visible, onComplete }) {
  const [role, setRole] = useState(null)
  const [step, setStep] = useState('role')   // role | details
  const [moveIn, setMoveIn] = useState('')
  const [floor, setFloor] = useState('')
  const [occupants, setOccupants] = useState('')

  function handleRoleSelect(r) {
    setRole(r)
    setStep('details')
  }

  function handleStart() {
    onComplete?.({ role: role.id, moveIn, floor, occupants })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.4s ease',
    }}>
      {/* Backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 420,
        margin: '0 24px',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(14,13,11,0.97)',
        border: `1.5px solid ${colors.gunmetal}`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${colors.amber}22`,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Amber top bar */}
        <div style={{ height: 3, background: `linear-gradient(to right, ${colors.amber}, ${colors.amberBright})` }} />

        <div style={{ padding: '24px 24px 28px' }}>
          {/* Logo + address */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 10,
              letterSpacing: '0.24em', color: colors.amber,
              textTransform: 'uppercase', marginBottom: 6,
            }}>MAINTEN</div>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: 15, color: colors.warmWhite,
              lineHeight: 1.35,
            }}>{address?.split(',')[0]}</div>
            <div style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 9,
              color: colors.gunmetal, marginTop: 3, letterSpacing: '0.05em',
            }}>
              {address?.split(',').slice(1).join(',').trim()}
            </div>
          </div>

          {/* ROLE STEP */}
          {step === 'role' && (
            <>
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 14,
                color: 'rgba(245,240,232,0.7)', marginBottom: 18, lineHeight: 1.5,
              }}>
                What is your relationship to this property?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleRoleSelect(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: role?.id === r.id ? `${colors.amber}18` : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${role?.id === r.id ? colors.amber : colors.gunmetal}`,
                      borderRadius: 12, padding: '14px 16px',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (role?.id !== r.id) {
                        e.currentTarget.style.borderColor = `${colors.amber}88`
                        e.currentTarget.style.background = `${colors.amber}0c`
                      }
                    }}
                    onMouseLeave={e => {
                      if (role?.id !== r.id) {
                        e.currentTarget.style.borderColor = colors.gunmetal
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      }
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{r.icon}</span>
                    <div>
                      <div style={{
                        fontFamily: 'Georgia, serif', fontSize: 14, color: colors.warmWhite,
                        lineHeight: 1.2,
                      }}>{r.label}</div>
                      <div style={{
                        fontFamily: 'ui-monospace, monospace', fontSize: 9,
                        color: colors.gunmetal, letterSpacing: '0.06em', marginTop: 3,
                      }}>{r.desc}</div>
                    </div>
                    {role?.id === r.id && (
                      <span style={{ marginLeft: 'auto', color: colors.amber, fontSize: 14 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* DETAILS STEP */}
          {step === 'details' && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              }}>
                <button
                  onClick={() => setStep('role')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.amber, fontFamily: 'ui-monospace, monospace',
                    fontSize: 9, letterSpacing: '0.1em', padding: 0,
                  }}
                >
                  ← BACK
                </button>
                <span style={{
                  fontFamily: 'Georgia, serif', fontSize: 13,
                  color: colors.warmWhite,
                }}>
                  {role?.icon} {role?.label}
                </span>
              </div>

              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 13,
                color: 'rgba(245,240,232,0.6)', marginBottom: 18, lineHeight: 1.5,
              }}>
                A few quick details to personalise your house profile.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field
                  label="Move-in date"
                  type="date"
                  value={moveIn}
                  onChange={setMoveIn}
                  placeholder="When did you move in?"
                />
                <Field
                  label="Unit / Floor"
                  value={floor}
                  onChange={setFloor}
                  placeholder="e.g. Unit 2, 2nd floor"
                />
                <Field
                  label="Number of occupants"
                  type="number"
                  value={occupants}
                  onChange={setOccupants}
                  placeholder="How many people live here?"
                  min="1" max="20"
                />
              </div>

              <button
                onClick={handleStart}
                style={{
                  marginTop: 20, width: '100%',
                  background: colors.amber, color: colors.carbon,
                  border: 'none', borderRadius: 12, padding: '14px 0',
                  fontFamily: 'ui-monospace, monospace', fontSize: 11,
                  fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: `0 4px 20px ${colors.amber}44`,
                  transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = colors.amberBright
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = colors.amber
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Open My House Profile
              </button>

              <div style={{
                marginTop: 12, textAlign: 'center',
                fontFamily: 'ui-monospace, monospace', fontSize: 8,
                color: colors.gunmetal, letterSpacing: '0.05em',
              }}>
                Fields are optional — you can complete your profile later
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, min, max }) {
  return (
    <div>
      <div style={{
        fontFamily: 'ui-monospace, monospace', fontSize: 9,
        letterSpacing: '0.1em', color: colors.gunmetal,
        textTransform: 'uppercase', marginBottom: 5,
      }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min} max={max}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${colors.gunmetal}`,
          borderRadius: 8, padding: '10px 12px',
          fontFamily: 'Georgia, serif', fontSize: 13,
          color: colors.warmWhite, outline: 'none',
          caretColor: colors.amber,
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.currentTarget.style.borderColor = colors.amber}
        onBlur={e => e.currentTarget.style.borderColor = colors.gunmetal}
      />
    </div>
  )
}
