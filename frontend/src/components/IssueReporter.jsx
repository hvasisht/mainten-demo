import { useState } from 'react'
import { colors } from '../tokens'

const URGENCY_COLORS = {
  URGENT: { bg: '#C4702022', border: '#C47020', text: '#C47020', label: 'URGENT' },
  SOON:   { bg: '#D4920A18', border: '#D4920A', text: '#D4920A', label: 'SOON' },
  MONITOR:{ bg: '#5A806018', border: '#5A8060', text: '#5A8060', label: 'MONITOR' },
}
const RESPONSIBILITY_COLORS = {
  LANDLORD: { color: colors.riskOrange, label: 'Landlord\'s Responsibility' },
  TENANT:   { color: '#5A8060',         label: 'Tenant\'s Responsibility' },
  SHARED:   { color: colors.amber,      label: 'Shared Responsibility' },
}

function Badge({ text, bg, border, textColor }) {
  return (
    <span style={{
      fontFamily: 'ui-monospace, monospace', fontSize: 8,
      letterSpacing: '0.12em', fontWeight: 700,
      color: textColor, background: bg,
      border: `1px solid ${border}`,
      borderRadius: 4, padding: '3px 7px',
    }}>{text}</span>
  )
}

export default function IssueReporter({ element, propertyData, visible, onClose }) {
  const [step, setStep] = useState('input')   // input | diagnosing | result
  const [issueText, setIssueText] = useState('')
  const [diagnosis, setDiagnosis] = useState(null)
  const [copied, setCopied] = useState(false)

  function handleClose() {
    setStep('input')
    setIssueText('')
    setDiagnosis(null)
    onClose?.()
  }

  async function runDiagnosis() {
    if (!issueText.trim()) return
    setStep('diagnosing')
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue: issueText.trim(),
          propertyData,
          element: { name: element.name, context: element.context },
        }),
      })
      const data = await res.json()
      setDiagnosis(data.diagnosis)
      setStep('result')
    } catch {
      setDiagnosis({
        diagnosis: 'Unable to diagnose at this time. Try again in a moment.',
        responsibility: 'LANDLORD',
        responsibilityReason: 'Could not determine — consult your landlord.',
        urgency: 'SOON',
        urgencyReason: 'Review manually.',
        jobBrief: issueText,
        diyPossible: false,
        diyNote: 'Seek professional assessment.',
      })
      setStep('result')
    }
  }

  function copyJobBrief() {
    navigator.clipboard.writeText(diagnosis.jobBrief)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const urgencyStyle = URGENCY_COLORS[diagnosis?.urgency] || URGENCY_COLORS.MONITOR
  const respStyle    = RESPONSIBILITY_COLORS[diagnosis?.responsibility] || RESPONSIBILITY_COLORS.LANDLORD

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 30,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: '0 0 40px',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.3s ease',
    }}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 560,
        maxHeight: '75vh',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(14,13,11,0.97)',
        border: `1.5px solid ${colors.gunmetal}`,
        boxShadow: `0 -8px 50px rgba(0,0,0,0.8), 0 0 0 1px ${colors.amber}18`,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Amber bar */}
        <div style={{ height: 3, background: `linear-gradient(to right, ${colors.amber}, ${colors.amberBright})` }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.gunmetal}44`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>{element?.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 9,
              color: colors.amber, letterSpacing: '0.14em',
              textTransform: 'uppercase', marginBottom: 2,
            }}>Report Issue</div>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: 14, color: colors.warmWhite,
            }}>{element?.name}</div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.gunmetal, fontSize: 20, padding: '0 4px', lineHeight: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.color = colors.warmWhite}
            onMouseLeave={e => e.currentTarget.style.color = colors.gunmetal}
          >×</button>
        </div>

        {/* Body — scrollable */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ─── INPUT STEP ─── */}
          {step === 'input' && (
            <div style={{ padding: '16px 16px 20px' }}>
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 13,
                color: 'rgba(245,240,232,0.65)', marginBottom: 14, lineHeight: 1.6,
              }}>
                Describe what you're seeing or experiencing. Be specific — the AI will cross-reference the property's construction era and systems.
              </div>
              <textarea
                autoFocus
                value={issueText}
                onChange={e => setIssueText(e.target.value)}
                placeholder="e.g. The radiator in the living room makes loud banging noises and doesn't heat evenly..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${colors.gunmetal}`,
                  borderRadius: 10,
                  padding: '11px 13px',
                  fontFamily: 'Georgia, serif', fontSize: 13,
                  color: colors.warmWhite,
                  outline: 'none', resize: 'vertical',
                  caretColor: colors.amber,
                  lineHeight: 1.6,
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.currentTarget.style.borderColor = colors.amber}
                onBlur={e => e.currentTarget.style.borderColor = colors.gunmetal}
              />
              <button
                onClick={runDiagnosis}
                disabled={!issueText.trim()}
                style={{
                  marginTop: 12, width: '100%',
                  background: issueText.trim() ? colors.amber : `${colors.amber}44`,
                  color: colors.carbon,
                  border: 'none', borderRadius: 10,
                  padding: '12px 0',
                  fontFamily: 'ui-monospace, monospace', fontSize: 11,
                  fontWeight: 700, letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  cursor: issueText.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
              >
                Diagnose Issue
              </button>
            </div>
          )}

          {/* ─── DIAGNOSING ─── */}
          {step === 'diagnosing' && (
            <div style={{
              padding: '40px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: `2px solid ${colors.amber}44`,
                borderTop: `2px solid ${colors.amber}`,
                animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 10,
                color: colors.amber, letterSpacing: '0.1em',
              }}>DIAGNOSING ISSUE</div>
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 12,
                color: 'rgba(245,240,232,0.45)', textAlign: 'center', lineHeight: 1.6,
              }}>
                Cross-referencing property construction era,<br />permit history, and building systems...
              </div>
            </div>
          )}

          {/* ─── RESULT ─── */}
          {step === 'result' && diagnosis && (
            <div style={{ padding: '16px 16px 20px' }}>

              {/* Status badges */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <Badge
                  text={urgencyStyle.label}
                  bg={urgencyStyle.bg} border={urgencyStyle.border} textColor={urgencyStyle.text}
                />
                <span style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 8,
                  letterSpacing: '0.1em', fontWeight: 700,
                  color: respStyle.color, border: `1px solid ${respStyle.color}66`,
                  background: `${respStyle.color}18`,
                  borderRadius: 4, padding: '3px 7px',
                }}>
                  {respStyle.label.toUpperCase()}
                </span>
              </div>

              {/* Diagnosis */}
              <Section label="Diagnosis">
                <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 13, color: 'rgba(245,240,232,0.8)', lineHeight: 1.65 }}>
                  {diagnosis.diagnosis}
                </p>
              </Section>

              {/* Responsibility */}
              <Section label="Responsibility">
                <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 12, color: 'rgba(245,240,232,0.65)', lineHeight: 1.6 }}>
                  <span style={{ color: respStyle.color, fontWeight: 700 }}>{diagnosis.responsibility}: </span>
                  {diagnosis.responsibilityReason}
                </p>
                {diagnosis.urgencyReason && (
                  <p style={{ margin: '6px 0 0', fontFamily: 'Georgia, serif', fontSize: 12, color: 'rgba(245,240,232,0.5)', lineHeight: 1.5 }}>
                    {diagnosis.urgencyReason}
                  </p>
                )}
              </Section>

              {/* Job Brief */}
              <Section label="Job Brief" rightAction={
                <button
                  onClick={copyJobBrief}
                  style={{
                    background: copied ? `${colors.goodGreen}22` : `${colors.amber}18`,
                    border: `1px solid ${copied ? colors.goodGreen : colors.amber}55`,
                    color: copied ? colors.goodGreen : colors.amber,
                    borderRadius: 5, padding: '3px 9px',
                    fontFamily: 'ui-monospace, monospace', fontSize: 8,
                    letterSpacing: '0.08em', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✓ COPIED' : 'COPY'}
                </button>
              }>
                <p style={{
                  margin: 0,
                  fontFamily: 'Georgia, serif', fontSize: 12,
                  color: 'rgba(245,240,232,0.7)', lineHeight: 1.7,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.gunmetal}44`,
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  {diagnosis.jobBrief}
                </p>
              </Section>

              {/* DIY note */}
              {diagnosis.diyNote && (
                <Section label={diagnosis.diyPossible ? 'DIY Possible' : 'Professional Required'}>
                  <p style={{
                    margin: 0, fontFamily: 'Georgia, serif', fontSize: 12,
                    color: diagnosis.diyPossible ? '#5A8060' : 'rgba(245,240,232,0.5)',
                    lineHeight: 1.6,
                  }}>
                    {diagnosis.diyNote}
                  </p>
                </Section>
              )}

              {/* New issue button */}
              <button
                onClick={() => { setStep('input'); setIssueText(''); setDiagnosis(null) }}
                style={{
                  marginTop: 4, width: '100%',
                  background: 'transparent',
                  border: `1px solid ${colors.gunmetal}`,
                  borderRadius: 10, padding: '10px 0',
                  fontFamily: 'ui-monospace, monospace', fontSize: 10,
                  letterSpacing: '0.12em', color: colors.gunmetal,
                  cursor: 'pointer', textTransform: 'uppercase',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.amber; e.currentTarget.style.color = colors.amber }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.gunmetal; e.currentTarget.style.color = colors.gunmetal }}
              >
                Report Another Issue
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function Section({ label, children, rightAction }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <div style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 9,
          letterSpacing: '0.12em', color: colors.gunmetal,
          textTransform: 'uppercase',
        }}>{label}</div>
        {rightAction}
      </div>
      {children}
    </div>
  )
}
