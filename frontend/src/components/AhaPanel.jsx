import { useState, useEffect, useRef } from 'react'
import { colors } from '../tokens'

const STATUS_COLORS = {
  RISK:      { bg: '#C4702022', border: '#C47020', text: '#C47020' },
  PROBABLE:  { bg: '#C4702015', border: '#C4702088', text: '#C47020' },
  INFERRED:  { bg: '#D4920A18', border: '#D4920A88', text: '#D4920A' },
  CONFIRMED: { bg: '#5A806022', border: '#5A8060', text: '#5A8060' },
  MONITOR:   { bg: '#D4920A12', border: '#D4920A66', text: '#D4920A' },
  CLEAR:     { bg: '#5A806015', border: '#5A806088', text: '#5A8060' },
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.MONITOR
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'ui-monospace, Consolas, monospace',
      fontSize: 8,
      letterSpacing: '0.12em',
      fontWeight: 700,
      color: s.text,
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 4,
      padding: '2px 6px',
      flexShrink: 0,
    }}>
      {status}
    </span>
  )
}

function InsightRow({ insight, index, visible }) {
  const [shown, setShown] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const s = STATUS_COLORS[insight.status] || STATUS_COLORS.MONITOR

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setShown(true), index * 550 + 200)
    return () => clearTimeout(t)
  }, [visible, index])

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateX(0)' : 'translateX(12px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        cursor: 'pointer',
        borderRadius: 8,
        border: `1px solid ${expanded ? s.border : colors.gunmetal + '55'}`,
        background: expanded ? s.bg : 'rgba(255,255,255,0.02)',
        padding: '8px 10px',
        marginBottom: 6,
        transition: 'opacity 0.45s ease, transform 0.45s ease, border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{insight.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 8,
              letterSpacing: '0.1em',
              color: colors.gunmetal,
              textTransform: 'uppercase',
            }}>{insight.category}</span>
            <StatusBadge status={insight.status} />
          </div>
          <div style={{
            fontFamily: 'Georgia, serif',
            fontSize: 12,
            color: colors.warmWhite,
            lineHeight: 1.4,
          }}>{insight.headline}</div>
        </div>
        <span style={{
          color: colors.gunmetal,
          fontSize: 10,
          flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
        }}>▾</span>
      </div>
      {expanded && (
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: `1px solid ${colors.gunmetal}33`,
          fontFamily: 'Georgia, serif',
          fontSize: 11,
          color: 'rgba(245,240,232,0.7)',
          lineHeight: 1.65,
        }}>
          {insight.detail}
        </div>
      )}
    </div>
  )
}

export default function AhaPanel({
  address,
  visible,
  onStartMaintening,
}) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState([])
  const [error, setError] = useState(null)
  const [allShown, setAllShown] = useState(false)
  const [propertyData, setPropertyData] = useState(null)
  const fetchedFor = useRef(null)

  useEffect(() => {
    if (!address || !visible) return
    if (fetchedFor.current === address) return
    fetchedFor.current = address

    setInsights([])
    setAllShown(false)
    setError(null)
    setLoading(true)

    // Step 1: fetch property data from backend
    fetch(`/api/property?address=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then(data => {
        setPropertyData(data)
        // Step 2: fetch Claude insights
        return fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyData: data }),
        })
      })
      .then(r => r.json())
      .then(result => {
        setInsights(result.insights || [])
        setLoading(false)
        // Mark all shown after last insight animation completes
        setTimeout(() => setAllShown(true), (result.insights?.length || 5) * 550 + 900)
      })
      .catch(err => {
        console.error('AhaPanel error:', err)
        setError('Could not load property data')
        setLoading(false)
      })
  }, [address, visible])

  const meta = propertyData?.assessor
  const yearBuilt = meta?.yearBuilt
  const luDesc = meta?.luDesc
  const units = propertyData?.units?.count

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      right: 32,
      transform: visible ? 'translate(0, -50%)' : 'translate(24px, -50%)',
      width: 300,
      maxHeight: '82vh',
      borderRadius: 16,
      overflow: 'hidden',
      background: 'rgba(14,13,11,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1.5px solid ${colors.gunmetal}`,
      boxShadow: `0 8px 50px rgba(0,0,0,0.75), 0 0 0 1px ${colors.amber}22`,
      zIndex: 10,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      pointerEvents: visible ? 'all' : 'none',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Amber top bar */}
      <div style={{ height: 3, background: `linear-gradient(to right, ${colors.amber}, ${colors.amberBright})`, flexShrink: 0 }} />

      {/* Scrollable body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${colors.gunmetal}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 9, letterSpacing: '0.18em',
              color: colors.amber, textTransform: 'uppercase',
            }}>
              Property Intelligence
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(66,133,244,0.12)',
              border: '1px solid rgba(66,133,244,0.35)',
              borderRadius: 4, padding: '2px 6px',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L9.5 9.5H2L7.5 14L5.5 21L12 17L18.5 21L16.5 14L22 9.5H14.5L12 2Z" fill="#4285F4"/>
              </svg>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, letterSpacing: '0.08em', color: 'rgba(66,133,244,0.9)' }}>
                Gemini
              </span>
            </div>
          </div>
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: 13,
            color: colors.warmWhite, lineHeight: 1.35,
          }}>
            {address?.split(',')[0]}
          </div>
          {meta && (
            <div style={{
              marginTop: 6,
              display: 'flex', flexWrap: 'wrap', gap: '4px 10px',
            }}>
              {yearBuilt && (
                <span style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9, color: colors.gunmetal }}>
                  Built {yearBuilt}
                </span>
              )}
              {luDesc && (
                <span style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9, color: colors.gunmetal }}>
                  {luDesc}
                </span>
              )}
              {units && (
                <span style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9, color: colors.gunmetal }}>
                  {units} {units === 1 ? 'unit' : 'units'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '12px 14px' }}>
          {loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{
                fontFamily: 'ui-monospace, Consolas, monospace',
                fontSize: 9, color: colors.amber, letterSpacing: '0.1em',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ animation: 'pulse 1.2s ease-in-out infinite' }}>◆</span>
                ANALYSING PROPERTY DATA
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  height: 52, borderRadius: 8,
                  background: `${colors.gunmetal}22`,
                  border: `1px solid ${colors.gunmetal}33`,
                  opacity: 1 - i * 0.15,
                }} />
              ))}
            </div>
          )}

          {error && (
            <div style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 10, color: colors.riskOrange,
              letterSpacing: '0.06em', padding: '12px 0',
            }}>
              {error}
            </div>
          )}

          {!loading && insights.map((insight, i) => (
            <InsightRow
              key={i}
              insight={insight}
              index={i}
              visible={!loading}
            />
          ))}

          {/* Data source attribution */}
          {!loading && insights.length > 0 && (
            <div style={{
              marginTop: 8,
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 8, color: colors.gunmetal + '99',
              letterSpacing: '0.05em', lineHeight: 1.6,
            }}>
              Data: Boston Assessor · ISD Permits · AI inference
            </div>
          )}
        </div>
      </div>

      {/* Start Maintening button */}
      {allShown && (
        <div style={{
          padding: '10px 14px 14px',
          borderTop: `1px solid ${colors.gunmetal}44`,
          flexShrink: 0,
          animation: 'fadeSlideUp 0.5s ease forwards',
        }}>
          <button
            onClick={() => onStartMaintening?.(propertyData)}
            style={{
              width: '100%',
              background: colors.amber,
              color: colors.carbon,
              border: 'none',
              borderRadius: 10,
              padding: '13px 0',
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${colors.amber}44`,
              transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = colors.amberBright
              e.currentTarget.style.boxShadow = `0 6px 28px ${colors.amber}66`
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = colors.amber
              e.currentTarget.style.boxShadow = `0 4px 20px ${colors.amber}44`
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Start Maintening
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
