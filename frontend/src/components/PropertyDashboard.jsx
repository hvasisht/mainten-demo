import { useState } from 'react'
import { colors } from '../tokens'
import ConditionScore from './ConditionScore'
import CanIPanel from './CanIPanel'

// Plain-English facts derived from real Boston Assessor + permit data
function buildFacts(propertyData) {
  const a = propertyData?.assessor || {}
  const permits = propertyData?.permits || {}
  const year = parseInt(a.yearBuilt) || null
  const facts = []

  // Age + lead paint risk
  if (year) {
    if (year < 1978) {
      facts.push({ icon: '⚠', label: 'Lead paint possible', detail: `Built ${year} — before the 1978 ban. Assume lead paint on all original surfaces.`, level: 'warn' })
    } else {
      facts.push({ icon: '✓', label: 'Built after 1978', detail: `Lead paint unlikely — built after the federal lead paint ban.`, level: 'ok' })
    }
  }

  // Pre-war wiring risk
  if (year && year < 1950) {
    facts.push({ icon: '⚡', label: 'Older wiring likely', detail: `Knob-and-tube wiring common in ${year}s buildings. Modern appliances may overload original circuits.`, level: 'warn' })
  }

  // Recent maintenance activity
  const now = new Date().getFullYear()
  const recent = (permits.records || []).filter(p => parseInt(p.issuedDate?.slice(0,4) || 0) >= now - 5)
  if (recent.length >= 2) {
    facts.push({ icon: '🔧', label: 'Recently maintained', detail: `${recent.length} permits filed in the last 5 years — sign of active upkeep.`, level: 'ok' })
  } else if (permits.total === 0) {
    facts.push({ icon: '📋', label: 'No permit history found', detail: `No renovation records found. Ask your landlord for maintenance history.`, level: 'warn' })
  }

  // Heat type in plain English
  if (a.heatType || a.heatSystem) {
    const heat = [a.heatType, a.heatSystem].filter(Boolean).join(' / ')
    facts.push({ icon: '🌡', label: 'Heat system', detail: heat, level: 'info' })
  }

  // Units
  if (propertyData?.units?.count) {
    const u = propertyData.units.count
    facts.push({ icon: '🏠', label: `${u}-unit building`, detail: `Shared building with ${u} units. Structural repairs are always the landlord's responsibility.`, level: 'info' })
  }

  return facts
}

const FACT_COLORS = {
  warn: { bg: `${colors.riskOrange}15`, border: `${colors.riskOrange}44`, text: colors.riskOrange },
  ok:   { bg: '#5A806015',              border: '#5A806044',              text: '#5A8060' },
  info: { bg: `${colors.amber}12`,      border: `${colors.amber}33`,      text: colors.amber },
}

function KeyFacts({ propertyData }) {
  const facts = buildFacts(propertyData)
  if (!facts.length) return null
  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div style={{
        fontFamily: 'ui-monospace, monospace', fontSize: 9,
        letterSpacing: '0.14em', color: colors.amber,
        textTransform: 'uppercase', marginBottom: 10,
      }}>What to know</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {facts.map((f, i) => {
          const s = FACT_COLORS[f.level]
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 8, padding: '8px 10px',
            }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
              <div>
                <div style={{
                  fontFamily: 'Georgia, serif', fontSize: 12,
                  color: colors.warmWhite, lineHeight: 1.3, marginBottom: 3,
                }}>{f.label}</div>
                <div style={{
                  fontFamily: 'Georgia, serif', fontSize: 11,
                  color: 'rgba(245,240,232,0.55)', lineHeight: 1.5,
                }}>{f.detail}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PropertyDashboard({ address, propertyData, visible }) {
  const [copied, setCopied] = useState(false)

  function shareLink() {
    const url = `${window.location.origin}/?a=${encodeURIComponent(address)}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (!propertyData) return null

  return (
    <div style={{
      position: 'absolute',
      right: 40, top: '50%',
      transform: visible ? 'translateY(-50%)' : 'translateY(calc(-50% + 20px))',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      pointerEvents: visible ? 'all' : 'none',
      zIndex: 10,
      width: 300,
      maxHeight: '82vh',
      borderRadius: 16,
      overflow: 'hidden',
      background: 'rgba(14,13,11,0.94)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1.5px solid ${colors.gunmetal}`,
      boxShadow: `0 10px 50px rgba(0,0,0,0.8), 0 0 0 1px ${colors.amber}22`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Amber bar */}
      <div style={{ height: 3, background: `linear-gradient(to right, ${colors.amber}, ${colors.amberBright})`, flexShrink: 0 }} />

      {/* Scrollable body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>

        {/* Condition Score */}
        <ConditionScore propertyData={propertyData} />

        {/* Plain-English key facts */}
        <KeyFacts propertyData={propertyData} />

        {/* Divider */}
        <div style={{ height: 1, background: `${colors.gunmetal}44`, margin: '8px 14px 0' }} />

        {/* Can I? — shown directly, no tab */}
        <CanIPanel propertyData={propertyData} />

      </div>

      {/* Share footer */}
      <div style={{
        padding: '10px 14px 12px',
        borderTop: `1px solid ${colors.gunmetal}44`,
        flexShrink: 0,
      }}>
        <button
          onClick={shareLink}
          style={{
            width: '100%',
            background: copied ? '#5A806022' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${copied ? '#5A8060' : colors.gunmetal}`,
            borderRadius: 10, padding: '10px 0',
            fontFamily: 'ui-monospace, monospace', fontSize: 10,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: copied ? '#5A8060' : colors.gunmetal,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = colors.amber; e.currentTarget.style.color = colors.amber }}}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = colors.gunmetal; e.currentTarget.style.color = colors.gunmetal }}}
        >
          {copied ? '✓ Link Copied — Share with anyone' : '↗ Share This Property Report'}
        </button>
      </div>
    </div>
  )
}
