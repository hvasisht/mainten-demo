import { useState } from 'react'
import { colors } from '../tokens'
import ConditionScore from './ConditionScore'
import PermitTimeline from './PermitTimeline'
import CanIPanel from './CanIPanel'

function NeighbourhoodContext({ propertyData }) {
  const nb = propertyData?.neighbourhood
  const a  = propertyData?.assessor
  if (!a?.yearBuilt) return null

  let line = null
  if (nb?.olderThanPct != null) {
    const hood = nb.neighbourhood || 'this area'
    const pct  = nb.olderThanPct
    if (pct >= 60) {
      line = `Older than ${pct}% of buildings in ${hood}`
    } else if (pct <= 20) {
      line = `Among the newest ${100 - pct}% of buildings in ${hood}`
    } else {
      line = `Built before ${pct}% of buildings in ${hood}`
    }
  } else {
    // Static fallback based on year
    const y = parseInt(a.yearBuilt)
    if (y < 1900)      line = `Pre-1900 construction — among the oldest buildings in Boston`
    else if (y < 1920) line = `Early 1900s — older than most Boston residential buildings`
    else if (y < 1940) line = `Inter-war era construction`
  }

  if (!line) return null

  return (
    <div style={{
      padding: '8px 16px',
      borderBottom: `1px solid ${colors.gunmetal}33`,
      display: 'flex', alignItems: 'center', gap: 7,
    }}>
      <span style={{ fontSize: 11 }}>📍</span>
      <span style={{
        fontFamily: 'Georgia, serif', fontSize: 11,
        color: 'rgba(200,180,120,0.6)', fontStyle: 'italic', lineHeight: 1.4,
      }}>
        {line}
      </span>
    </div>
  )
}

export default function PropertyDashboard({ address, propertyData, visible }) {
  const [tab, setTab]       = useState('permits')   // permits | cani
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

        {/* Neighbourhood context */}
        <NeighbourhoodContext propertyData={propertyData} />

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.gunmetal}44`,
          flexShrink: 0,
        }}>
          {[
            { id: 'permits', label: 'Permit History' },
            { id: 'cani',    label: 'Can I?' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '9px 0',
                background: 'none', border: 'none',
                borderBottom: tab === t.id ? `2px solid ${colors.amber}` : '2px solid transparent',
                fontFamily: 'ui-monospace, monospace', fontSize: 9,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: tab === t.id ? colors.amber : colors.gunmetal,
                cursor: 'pointer', transition: 'color 0.15s',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'permits' && (
          <PermitTimeline
            permits={propertyData.permits}
            yearBuilt={propertyData.assessor?.yearBuilt}
          />
        )}
        {tab === 'cani' && (
          <CanIPanel propertyData={propertyData} />
        )}
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
            background: copied ? `${colors.goodGreen}22` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${copied ? colors.goodGreen : colors.gunmetal}`,
            borderRadius: 10, padding: '10px 0',
            fontFamily: 'ui-monospace, monospace', fontSize: 10,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: copied ? colors.goodGreen : colors.gunmetal,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = colors.amber; e.currentTarget.style.color = colors.amber }}}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = colors.gunmetal; e.currentTarget.style.color = colors.gunmetal }}}
        >
          {copied ? (
            <><span>✓</span> Link Copied — Share with anyone</>
          ) : (
            <><span>↗</span> Share This Property Report</>
          )}
        </button>
      </div>
    </div>
  )
}
