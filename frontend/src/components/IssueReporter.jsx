import { useState } from 'react'
import { colors } from '../tokens'

const TOOL_LABELS = {
  assess_construction_risk: { icon: '🏗', label: 'Construction risk assessed' },
  lookup_housing_regulation: { icon: '⚖', label: 'Housing regulation retrieved' },
  get_service_contacts: { icon: '📞', label: 'Service contacts found' },
}

const AGENT_STEPS = [
  'Consulting MA housing regulations...',
  'Assessing construction-era risks...',
  'Cross-referencing permit history...',
  'Determining responsibility...',
  'Compiling diagnosis...',
]

function AgentTrace({ toolsUsed, source }) {
  const [open, setOpen] = useState(false)
  if (!toolsUsed || toolsUsed.length === 0) return null
  const isClaude = source === 'claude-agent'
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 0', width: '100%',
        }}
      >
        <div style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 9,
          letterSpacing: '0.12em', color: isClaude ? '#c17f58' : colors.gunmetal,
          textTransform: 'uppercase', flex: 1, textAlign: 'left',
        }}>
          {isClaude ? '🤖 Agent Trace' : 'Tool Calls'} — {toolsUsed.length} tool{toolsUsed.length !== 1 ? 's' : ''} used
        </div>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M2 3.5l3 3 3-3" stroke={isClaude ? '#c17f58' : colors.gunmetal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {toolsUsed.map((t, i) => {
            const meta = TOOL_LABELS[t.tool] || { icon: '🔧', label: t.tool }
            const detail = t.result?.detail || t.result?.rule || t.result?.summary || ''
            const level = t.result?.level
            const levelColor = level === 'HIGH' ? colors.riskOrange : level === 'MEDIUM' ? colors.amber : level === 'LOW' ? '#5A8060' : colors.gunmetal
            return (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${colors.gunmetal}44`,
                borderRadius: 8, padding: '8px 10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: detail ? 4 : 0 }}>
                  <span style={{ fontSize: 12 }}>{meta.icon}</span>
                  <span style={{
                    fontFamily: 'ui-monospace, monospace', fontSize: 8,
                    letterSpacing: '0.08em', color: 'rgba(245,240,232,0.6)',
                    flex: 1,
                  }}>{meta.label}</span>
                  {level && (
                    <span style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 7,
                      color: levelColor, border: `1px solid ${levelColor}66`,
                      background: `${levelColor}18`, borderRadius: 3, padding: '2px 5px',
                      letterSpacing: '0.08em',
                    }}>{level}</span>
                  )}
                </div>
                {detail && (
                  <div style={{
                    fontFamily: 'Georgia, serif', fontSize: 11,
                    color: 'rgba(245,240,232,0.45)', lineHeight: 1.55,
                    marginLeft: 18,
                  }}>{detail.length > 120 ? detail.slice(0, 120) + '…' : detail}</div>
                )}
              </div>
            )
          })}
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 8,
            color: colors.gunmetal, letterSpacing: '0.06em',
            marginTop: 2, paddingLeft: 2,
          }}>
            {isClaude ? 'Powered by Claude (Anthropic) · ReAct agent pattern' : 'Powered by Gemini · Tool simulation'}
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [toolsUsed, setToolsUsed] = useState([])
  const [agentSource, setAgentSource] = useState('')
  const [copied, setCopied] = useState(false)
  const [agentStepIdx, setAgentStepIdx] = useState(0)

  function handleClose() {
    setStep('input')
    setIssueText('')
    setDiagnosis(null)
    setToolsUsed([])
    setAgentSource('')
    setAgentStepIdx(0)
    onClose?.()
  }

  async function runDiagnosis() {
    if (!issueText.trim()) return
    setStep('diagnosing')
    setAgentStepIdx(0)
    // Animate through agent step labels while waiting
    const interval = setInterval(() => {
      setAgentStepIdx(i => (i + 1) % AGENT_STEPS.length)
    }, 1400)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue: issueText.trim(),
          propertyData,
          element: { name: element.name, context: element.context },
        }),
      })
      const data = await res.json()
      clearInterval(interval)
      setDiagnosis(data.diagnosis)
      setToolsUsed(data.toolsUsed || [])
      setAgentSource(data.source || '')
      setStep('result')
    } catch {
      clearInterval(interval)
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
      setToolsUsed([])
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 9,
                color: colors.amber, letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}>Report Issue</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'rgba(193,127,88,0.12)',
                border: '1px solid rgba(193,127,88,0.35)',
                borderRadius: 3, padding: '1px 4px',
              }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 6, color: 'rgba(193,127,88,0.9)', letterSpacing: '0.06em' }}>Claude Agent</span>
              </div>
            </div>
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
              padding: '36px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `2px solid #c17f5844`,
                borderTop: `2px solid #c17f58`,
                animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 9,
                color: '#c17f58', letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>Agent Running</div>
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 12,
                color: 'rgba(245,240,232,0.55)', textAlign: 'center', lineHeight: 1.6,
                minHeight: 20, transition: 'opacity 0.4s',
              }}>
                {AGENT_STEPS[agentStepIdx]}
              </div>
              <div style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 8,
                color: 'rgba(245,240,232,0.25)', letterSpacing: '0.06em', textAlign: 'center',
              }}>
                Claude · ReAct agent · tool use
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

              {/* Agent trace */}
              <AgentTrace toolsUsed={toolsUsed} source={agentSource} />

              {/* New issue button */}
              <button
                onClick={() => { setStep('input'); setIssueText(''); setDiagnosis(null); setToolsUsed([]); setAgentSource('') }}
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
