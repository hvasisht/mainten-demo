import { useState, useEffect, useRef } from 'react'
import { colors } from '../tokens'

const INITIAL_MESSAGES = {
  boiler: "I know this building. Tell me what you want to know about the heating system — how it works, what to check, what sounds are normal, anything.",
  electrical: "The electrical in this building is the most important thing to understand. What do you want to know?",
  kitchen: "The kitchen pipes are part of a shared stack running through all three floors. What's happening — are you seeing pressure issues, discolouration, or something else?",
  bathroom: "The bathroom stack in a triple-decker this age has some specific things worth knowing. What's your question?",
  frontwall: "This wall holds the building up. What do you want to know — drilling, hanging things, what's behind it, load capacity?",
  roof: "The roof is the building's first line of defence. What do you want to know?",
}

function renderMarkdown(text) {
  // Bold **text**
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Bullet points starting with • or -
  html = html.replace(/^[•\-] (.+)/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul style="margin:4px 0 4px 14px;padding:0">$1</ul>')
  // Paragraph breaks
  html = html.replace(/\n\n/g, '</p><p style="margin:6px 0">')
  html = html.replace(/\n/g, '<br/>')
  return `<p style="margin:0">${html}</p>`
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!isUser && (
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: `${colors.amber}22`,
          border: `1px solid ${colors.amber}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'ui-monospace, monospace', fontSize: 9,
          color: colors.amber, flexShrink: 0, marginRight: 8, marginTop: 2,
        }}>M</div>
      )}
      <div style={{
        maxWidth: '78%',
        background: isUser
          ? `${colors.amber}18`
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isUser ? colors.amber + '55' : colors.gunmetal + '44'}`,
        borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        padding: '9px 12px',
        fontFamily: 'Georgia, serif',
        fontSize: 12,
        color: isUser ? colors.amberLight : 'rgba(245,240,232,0.85)',
        lineHeight: 1.65,
      }}>
        {isUser
          ? msg.content
          : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        }
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: `${colors.amber}22`, border: `1px solid ${colors.amber}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace', fontSize: 9, color: colors.amber,
      }}>M</div>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${colors.gunmetal}44`,
        borderRadius: '4px 12px 12px 12px',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: colors.amber,
            animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

const SUGGESTED_QUESTIONS = {
  boiler:     ['Is this safe?', 'What sounds are normal?', 'Who maintains it?'],
  electrical: ['What\'s knob-and-tube?', 'Is it safe to use my microwave?', 'Who\'s responsible?'],
  kitchen:    ['Why is my water pressure low?', 'Whose job is this?', 'What does galvanised mean?'],
  bathroom:   ['Can I replace the showerhead?', 'What causes that smell?', 'Is mould the landlord\'s problem?'],
  frontwall:  ['Can I drill here?', 'Can I put up shelves?', 'What\'s inside the wall?'],
  roof:       ['Who fixes a leak?', 'How do I report this?', 'What\'s the roof made of?'],
}

export default function ChatPanel({ element, propertyData, visible, onClose, onReportIssue }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const prevElement = useRef(null)

  // Reset when element changes
  useEffect(() => {
    if (!element) return
    if (prevElement.current?.id === element.id) return
    prevElement.current = element

    const greeting = INITIAL_MESSAGES[element.id] || `What do you want to know about the ${element.name}?`
    setMessages([{ role: 'assistant', content: greeting }])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [element])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          propertyData,
          element: { name: element.name, context: element.context },
        }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'Something went wrong.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Could not reach Mainten AI right now. Try again in a moment.' }])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = element ? (SUGGESTED_QUESTIONS[element.id] || []) : []
  const showSuggestions = messages.length <= 1 && !loading

  return (
    <div style={{
      position: 'absolute',
      right: 40,
      top: '50%',
      transform: visible ? 'translateY(-50%)' : 'translateY(calc(-50% + 20px))',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      pointerEvents: visible ? 'all' : 'none',
      zIndex: 15,
      width: 320,
      maxHeight: '78vh',
      borderRadius: 16,
      overflow: 'hidden',
      background: 'rgba(14,13,11,0.94)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1.5px solid ${colors.gunmetal}`,
      boxShadow: `0 10px 50px rgba(0,0,0,0.8), 0 0 0 1px ${colors.amber}22`,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top accent */}
      <div style={{ height: 3, background: `linear-gradient(to right, ${colors.amber}, ${colors.amberBright})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px',
        borderBottom: `1px solid ${colors.gunmetal}44`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>{element?.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: 13,
            color: colors.warmWhite, lineHeight: 1.2,
          }}>{element?.name}</div>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 8,
            color: colors.gunmetal, letterSpacing: '0.08em',
            marginTop: 2,
          }}>AI PROPERTY ADVISOR</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onReportIssue && (
            <button
              onClick={() => onReportIssue(element)}
              style={{
                background: `${colors.riskOrange}22`,
                border: `1px solid ${colors.riskOrange}66`,
                color: colors.riskOrange,
                borderRadius: 6,
                padding: '4px 8px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 8, letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${colors.riskOrange}38`}
              onMouseLeave={e => e.currentTarget.style.background = `${colors.riskOrange}22`}
            >
              REPORT ISSUE
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.gunmetal, fontSize: 16, padding: '0 2px',
              lineHeight: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.color = colors.warmWhite}
            onMouseLeave={e => e.currentTarget.style.color = colors.gunmetal}
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          padding: '4px 14px 8px',
          display: 'flex', flexWrap: 'wrap', gap: 6,
        }}>
          {suggestions.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              style={{
                background: `${colors.amber}14`,
                border: `1px solid ${colors.amber}44`,
                color: colors.amberLight,
                borderRadius: 20,
                padding: '4px 10px',
                fontFamily: 'Georgia, serif',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${colors.amber}28`; e.currentTarget.style.borderColor = colors.amber }}
              onMouseLeave={e => { e.currentTarget.style.background = `${colors.amber}14`; e.currentTarget.style.borderColor = `${colors.amber}44` }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '8px 14px 12px',
        borderTop: `1px solid ${colors.gunmetal}44`,
        flexShrink: 0,
      }}>
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything — repairs, contacts, rights…"
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${colors.gunmetal}`,
              borderRadius: 8,
              padding: '9px 12px',
              fontFamily: 'Georgia, serif',
              fontSize: 12,
              color: colors.warmWhite,
              outline: 'none',
              caretColor: colors.amber,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = colors.amber}
            onBlur={e => e.currentTarget.style.borderColor = colors.gunmetal}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: loading || !input.trim() ? `${colors.amber}33` : colors.amber,
              border: 'none', cursor: loading || !input.trim() ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke={colors.carbon} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
