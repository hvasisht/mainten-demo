import { useState } from 'react'
import { colors } from '../tokens'

const SAFE_STYLES = {
  YES:     { bg: '#5A806018', border: '#5A806088', text: '#5A8060', label: 'YES' },
  CAUTION: { bg: '#D4920A18', border: '#D4920A88', text: '#D4920A', label: 'CAUTION' },
  NO:      { bg: '#C4702018', border: '#C4702088', text: '#C47020', label: 'NO' },
  INFO:    { bg: '#54545018', border: '#54545088', text: '#888884', label: 'INFO' },
}

const PRESET_QUESTIONS = [
  { label: 'Drill here?',        q: 'Can I drill into the walls?' },
  { label: 'Replace showerhead?',q: 'Can I replace the showerhead myself?' },
  { label: 'Put up shelves?',    q: 'Can I put up shelves on the walls?' },
  { label: 'Wear and tear?',     q: 'What counts as normal wear and tear vs damage?' },
  { label: 'Command strips?',    q: 'Can I use command strips on these walls?' },
  { label: 'Paint walls?',       q: 'Can I paint the walls?' },
]

export default function CanIPanel({ propertyData }) {
  const [answer, setAnswer]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [custom, setCustom]   = useState('')
  const [asked, setAsked]     = useState('')

  async function ask(question) {
    setLoading(true)
    setAnswer(null)
    setAsked(question)
    try {
      const res = await fetch('/api/cani', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, propertyData }),
      })
      setAnswer(await res.json())
    } catch {
      setAnswer({ answer: 'Could not reach Mainten AI. Try again.', safe: 'INFO' })
    } finally {
      setLoading(false)
    }
  }

  const safeStyle = SAFE_STYLES[answer?.safe] || SAFE_STYLES.INFO

  return (
    <div style={{ padding: '12px 16px 14px', borderTop: `1px solid ${colors.gunmetal}44` }}>
      <div style={{
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: 9, letterSpacing: '0.14em',
        color: colors.amber, textTransform: 'uppercase', marginBottom: 10,
      }}>
        Can I?
      </div>

      {/* Preset chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {PRESET_QUESTIONS.map(({ label, q }) => (
          <button
            key={label}
            onClick={() => ask(q)}
            disabled={loading}
            style={{
              background: `${colors.amber}14`,
              border: `1px solid ${colors.amber}44`,
              color: colors.amberLight,
              borderRadius: 20, padding: '4px 10px',
              fontFamily: 'Georgia, serif', fontSize: 10,
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${colors.amber}28`; e.currentTarget.style.borderColor = colors.amber }}
            onMouseLeave={e => { e.currentTarget.style.background = `${colors.amber}14`; e.currentTarget.style.borderColor = `${colors.amber}44` }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom question */}
      <form
        onSubmit={e => { e.preventDefault(); if (custom.trim()) ask(custom.trim()) }}
        style={{ display: 'flex', gap: 6, marginBottom: 10 }}
      >
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="Ask anything about your home…"
          disabled={loading}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${colors.gunmetal}`,
            borderRadius: 8, padding: '7px 10px',
            fontFamily: 'Georgia, serif', fontSize: 11,
            color: colors.warmWhite, outline: 'none',
            caretColor: colors.amber,
          }}
          onFocus={e => e.currentTarget.style.borderColor = colors.amber}
          onBlur={e => e.currentTarget.style.borderColor = colors.gunmetal}
        />
        <button
          type="submit"
          disabled={loading || !custom.trim()}
          style={{
            width: 32, height: 32, borderRadius: 7,
            background: loading || !custom.trim() ? `${colors.amber}33` : colors.amber,
            border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M7 2l5 5-5 5" stroke={colors.carbon} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${colors.gunmetal}44`,
          borderRadius: 8,
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 9,
            color: colors.amber, letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>◆</span>
            Checking your property…
          </div>
        </div>
      )}

      {/* Answer */}
      {!loading && answer && (
        <div style={{
          background: `${safeStyle.bg}`,
          border: `1px solid ${safeStyle.border}`,
          borderRadius: 8, padding: '10px 12px',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <span style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 8,
              color: colors.gunmetal, letterSpacing: '0.06em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>{asked}</span>
            <span style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 8,
              fontWeight: 700, letterSpacing: '0.1em',
              color: safeStyle.text, flexShrink: 0, marginLeft: 8,
              background: `${safeStyle.text}18`,
              border: `1px solid ${safeStyle.border}`,
              borderRadius: 4, padding: '2px 6px',
            }}>{safeStyle.label}</span>
          </div>
          <p style={{
            margin: 0,
            fontFamily: 'Georgia, serif', fontSize: 11,
            color: 'rgba(245,240,232,0.8)', lineHeight: 1.65,
          }}>
            {answer.answer}
          </p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
}
