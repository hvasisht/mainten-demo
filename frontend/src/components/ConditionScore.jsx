import { useEffect, useState } from 'react'
import { colors } from '../tokens'

export function calculateScore(propertyData) {
  if (!propertyData?.assessor) return null
  const a = propertyData.assessor
  const permits = propertyData.permits || {}
  let score = 7.0

  // Age adjustment
  const year = parseInt(a.yearBuilt) || 1950
  if (year < 1900)      score -= 2.2
  else if (year < 1920) score -= 1.8
  else if (year < 1940) score -= 1.3
  else if (year < 1960) score -= 0.8
  else if (year < 1980) score -= 0.3
  else if (year > 2000) score += 0.5

  // Overall condition code
  const cond = (a.overallCond || '').toUpperCase()
  if (/EXCELL|VERY GOOD/.test(cond))  score += 0.8
  else if (/GOOD/.test(cond))         score += 0.3
  else if (/FAIR/.test(cond))         score -= 1.0
  else if (/POOR/.test(cond))         score -= 2.5
  else if (/UNSOUND/.test(cond))      score -= 4.5

  // External condition (half weight)
  const ext = (a.extCond || '').toUpperCase()
  if (/GOOD/.test(ext))  score += 0.2
  else if (/FAIR/.test(ext))  score -= 0.5
  else if (/POOR/.test(ext))  score -= 1.2

  // Permit activity
  const now = new Date().getFullYear()
  const recentPermits = (permits.records || []).filter(p => {
    const y = parseInt(p.issuedDate?.slice(0, 4) || 0)
    return y >= now - 10
  }).length
  if (recentPermits >= 4)      score += 1.0
  else if (recentPermits >= 2) score += 0.5
  else if (recentPermits >= 1) score += 0.2
  else if (permits.total === 0) score -= 0.4

  return Math.max(1.2, Math.min(9.8, score))
}

function scoreColor(s) {
  if (s >= 7.5) return '#5A8060'
  if (s >= 5.0) return colors.amber
  return colors.riskOrange
}

function scoreLabel(s) {
  if (s >= 8.5) return 'Excellent'
  if (s >= 7.0) return 'Good'
  if (s >= 5.5) return 'Fair'
  if (s >= 4.0) return 'Poor'
  return 'Critical'
}

export default function ConditionScore({ propertyData }) {
  const raw = calculateScore(propertyData)
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (!raw) return
    setDisplayed(0)
    let start = null
    const duration = 1200
    const animate = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(parseFloat((eased * raw).toFixed(1)))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [raw])

  if (!raw) return null
  const color = scoreColor(raw)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 16px',
      borderBottom: `1px solid ${colors.gunmetal}44`,
    }}>
      {/* Score ring */}
      <div style={{ position: 'relative', flexShrink: 0, width: 64, height: 64 }}>
        <svg width={64} height={64} viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={32} cy={32} r={26} fill="none" stroke={`${color}22`} strokeWidth={5} />
          <circle cx={32} cy={32} r={26} fill="none" stroke={color} strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 26}`}
            strokeDashoffset={`${2 * Math.PI * 26 * (1 - displayed / 10)}`}
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 18, fontWeight: 700, color, lineHeight: 1,
          }}>{displayed.toFixed(1)}</span>
          <span style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 7, color: colors.gunmetal, letterSpacing: '0.06em',
          }}>/10</span>
        </div>
      </div>

      {/* Label */}
      <div>
        <div style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 9, letterSpacing: '0.12em',
          color: colors.gunmetal, textTransform: 'uppercase', marginBottom: 3,
        }}>Condition Score</div>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 16,
          color, lineHeight: 1.2,
        }}>{scoreLabel(raw)}</div>
        <div style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 8, color: colors.gunmetal, marginTop: 3, letterSpacing: '0.05em',
        }}>
          Based on assessor data · permits · age
        </div>
      </div>
    </div>
  )
}
