import { useState, useEffect, useRef } from 'react'
import { colors } from '../tokens'

const INITIAL_MESSAGES = {
  home:       "Ask me anything about this property — repairs, tenant rights, safety issues, permits, or what to watch out for.",
  boiler:     "Ask me anything about the heating system — how it works, repair rights, who to call, what sounds are normal.",
  electrical: "Ask me anything about the electrical — knob-and-tube risks, what's safe to plug in, who's responsible for repairs.",
  kitchen:    "Ask me anything about this kitchen — pipe issues, pest problems, repairs, who to call, landlord responsibility.",
  bathroom:   "Ask me anything about this bathroom — leaks, mould, repairs, plumber contacts, or anything else.",
  bedroom:    "Ask me anything about this bedroom — lead paint, drilling walls, safety, tenant rights, or anything at all.",
  living:     "Ask me anything about this room — wall safety, drilling, what's load-bearing, or any issue you're dealing with.",
  roof:       "Ask me anything about the roof — leaks, who fixes it, repair timeline, or what signs to watch for.",
}

const SUGGESTED_QUESTIONS = {
  home:       ['What should I check when moving in?', 'Who is responsible for repairs?', 'What are my tenant rights?'],
  boiler:     ['Who do I call for repairs?', 'What sounds are normal?', 'Is this safe?'],
  electrical: ['Who\'s responsible for repairs?', 'What\'s knob-and-tube wiring?', 'Is it safe to use my microwave?'],
  kitchen:    ['There is a dead rat in kitchen', 'Who do I call for plumbing?', 'Why is my water pressure low?'],
  bathroom:   ['There is mould in the bathroom', 'Who do I call for leaks?', 'Can I replace the showerhead?'],
  bedroom:    ['Is the lead paint dangerous?', 'Can I drill into walls?', 'Who do I contact about safety issues?'],
  living:     ['Can I put up shelves?', 'What\'s inside the wall?', 'Who do I call for structural issues?'],
  roof:       ['Who fixes a roof leak?', 'How do I report this?', 'Is this landlord\'s responsibility?'],
}

const DOC_CATEGORIES = [
  { id: 'lease',       label: 'Lease Agreement',   icon: '📄' },
  { id: 'electricity', label: 'Electricity Bill',   icon: '⚡' },
  { id: 'water',       label: 'Water/Gas Bill',     icon: '💧' },
  { id: 'inspection',  label: 'Inspection Report',  icon: '🔍' },
  { id: 'other',       label: 'Other Document',     icon: '📎' },
]

const URGENCY_COLORS = {
  HIGH:   { bg: `${colors.riskOrange}18`, border: `${colors.riskOrange}55`, text: colors.riskOrange },
  MEDIUM: { bg: `${colors.amber}15`,      border: `${colors.amber}44`,      text: colors.amber },
  LOW:    { bg: 'rgba(90,128,96,0.15)',   border: 'rgba(90,128,96,0.4)',    text: '#5A8060' },
}

function renderMarkdown(text) {
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/^[•\-] (.+)/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul style="margin:4px 0 4px 14px;padding:0">$1</ul>')
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
        background: isUser ? `${colors.amber}18` : 'rgba(255,255,255,0.04)',
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

export default function ChatPanel({ element, propertyData, userProfile, onClose, onReportIssue }) {
  const [activeTab, setActiveTab]               = useState('ask')
  const [messages, setMessages]                 = useState([])
  const [input, setInput]                       = useState('')
  const [loading, setLoading]                   = useState(false)
  const [documents, setDocuments]               = useState([])
  const [suggestions, setSuggestions]           = useState(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [uploadCategory, setUploadCategory]     = useState('Lease Agreement')
  const [pasteMode, setPasteMode]               = useState(false)
  const [pasteText, setPasteText]               = useState('')
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const fileInputRef = useRef(null)
  const prevId     = useRef(null)

  // Reset chat when element changes
  useEffect(() => {
    const id = element?.id ?? 'home'
    if (prevId.current === id) return
    prevId.current = id
    const base = INITIAL_MESSAGES[id] || `What do you want to know about the ${element?.name || 'property'}?`
    const greeting = userProfile?.floor && element
      ? `${base}\n\nI can see you're in unit/floor ${userProfile.floor}.`
      : base
    setMessages([{ role: 'assistant', content: greeting }])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [element])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Fetch suggestions on first visit to that tab
  useEffect(() => {
    if (activeTab !== 'suggestions' || suggestions !== null) return
    fetchSuggestions()
  }, [activeTab])

  async function fetchSuggestions() {
    setSuggestionsLoading(true)
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyData, userProfile }),
      })
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch {
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }

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
          element: {
            name: element?.name || 'Home',
            context: element?.context || 'General property and tenant questions for this address.',
          },
          userProfile,
          documents: documents.length > 0
            ? documents.map(d => ({ name: d.name, category: d.category, content: d.content }))
            : undefined,
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

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setDocuments(prev => [...prev, {
        id: Date.now(),
        name: file.name,
        category: uploadCategory,
        content: (ev.target.result || '').slice(0, 8000),
      }])
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function addPastedDoc() {
    if (!pasteText.trim()) return
    setDocuments(prev => [...prev, {
      id: Date.now(),
      name: `Pasted ${uploadCategory}`,
      category: uploadCategory,
      content: pasteText.trim().slice(0, 8000),
    }])
    setPasteText('')
    setPasteMode(false)
  }

  const elId = element?.id ?? 'home'
  const quickQuestions = SUGGESTED_QUESTIONS[elId] || []
  const showQuickQ = messages.length <= 1 && !loading && activeTab === 'ask'

  return (
    <div style={{
      maxHeight: '36vh',
      borderRadius: 16,
      overflow: 'hidden',
      background: 'rgba(14,13,11,0.96)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: `1.5px solid ${colors.gunmetal}`,
      boxShadow: `0 -4px 32px rgba(0,0,0,0.6), 0 0 0 1px ${colors.amber}22`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Top accent */}
      <div style={{ height: 3, background: `linear-gradient(to right, ${colors.amber}, ${colors.amberBright})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        padding: '10px 14px 0',
        borderBottom: `1px solid ${colors.gunmetal}44`,
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 15 }}>{element?.icon || '🏠'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: colors.warmWhite, lineHeight: 1.2 }}>
              ASK YOUR HOME
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: colors.gunmetal, letterSpacing: '0.08em' }}>
                {element ? element.name.toUpperCase() : 'AI PROPERTY ADVISOR'}
              </span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.35)',
                borderRadius: 3, padding: '1px 4px',
              }}>
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L9.5 9.5H2L7.5 14L5.5 21L12 17L18.5 21L16.5 14L22 9.5H14.5L12 2Z" fill="#4285F4"/>
                </svg>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 6, color: 'rgba(66,133,244,0.9)', letterSpacing: '0.06em' }}>Gemini</span>
              </div>
              {documents.length > 0 && (
                <div style={{
                  background: `${colors.amber}20`, border: `1px solid ${colors.amber}44`,
                  borderRadius: 3, padding: '1px 5px',
                  fontFamily: 'ui-monospace, monospace', fontSize: 6,
                  color: colors.amber, letterSpacing: '0.06em',
                }}>{documents.length} DOC{documents.length > 1 ? 'S' : ''} ACTIVE</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {onReportIssue && element && (
              <button
                onClick={() => onReportIssue(element)}
                style={{
                  background: `${colors.riskOrange}22`, border: `1px solid ${colors.riskOrange}66`,
                  color: colors.riskOrange, borderRadius: 6, padding: '4px 8px',
                  fontFamily: 'ui-monospace, monospace', fontSize: 8, letterSpacing: '0.08em',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${colors.riskOrange}38`}
                onMouseLeave={e => e.currentTarget.style.background = `${colors.riskOrange}22`}
              >REPORT ISSUE</button>
            )}
            {element && (
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: `1px solid ${colors.gunmetal}55`, cursor: 'pointer',
                  color: colors.gunmetal, fontSize: 11, padding: '2px 7px',
                  borderRadius: 5, lineHeight: 1, fontFamily: 'ui-monospace, monospace',
                  letterSpacing: '0.06em', transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.amber; e.currentTarget.style.color = colors.amber }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${colors.gunmetal}55`; e.currentTarget.style.color = colors.gunmetal }}
              >← home</button>
            )}
          </div>
        </div>

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 4, paddingBottom: 8 }}>
          {[
            { id: 'ask',         label: 'ASK' },
            { id: 'suggestions', label: 'SUGGESTIONS' },
            { id: 'monitor',     label: documents.length > 0 ? `MONITOR (${documents.length})` : 'MONITOR' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: tab.id === 'suggestions' ? 1.5 : 1,
                padding: '5px 4px',
                background: activeTab === tab.id ? `${colors.amber}20` : 'transparent',
                border: `1px solid ${activeTab === tab.id ? colors.amber + '66' : colors.gunmetal + '44'}`,
                borderRadius: 6,
                fontFamily: 'ui-monospace, monospace', fontSize: 7.5,
                color: activeTab === tab.id ? colors.amber : colors.gunmetal,
                cursor: 'pointer', letterSpacing: '0.08em',
                transition: 'all 0.15s',
              }}
            >{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ══ ASK TAB ══ */}
      {activeTab === 'ask' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 8px' }}>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {showQuickQ && quickQuestions.length > 0 && (
            <div style={{ padding: '4px 14px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    background: `${colors.amber}14`, border: `1px solid ${colors.amber}44`,
                    color: colors.amberLight, borderRadius: 20, padding: '4px 10px',
                    fontFamily: 'Georgia, serif', fontSize: 11, cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${colors.amber}28`; e.currentTarget.style.borderColor = colors.amber }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${colors.amber}14`; e.currentTarget.style.borderColor = `${colors.amber}44` }}
                >{q}</button>
              ))}
            </div>
          )}

          <div style={{ padding: '8px 14px 12px', borderTop: `1px solid ${colors.gunmetal}44`, flexShrink: 0 }}>
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(input) }}
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={element ? `Ask about ${element.name.toLowerCase()}…` : 'Ask anything about your home…'}
                disabled={loading}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${colors.gunmetal}`, borderRadius: 8,
                  padding: '9px 12px', fontFamily: 'Georgia, serif', fontSize: 12,
                  color: colors.warmWhite, outline: 'none', caretColor: colors.amber,
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
                  transition: 'background 0.15s', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke={colors.carbon} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>
        </>
      )}

      {/* ══ SUGGESTIONS TAB ══ */}
      {activeTab === 'suggestions' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {suggestionsLoading ? (
            <div style={{ padding: '20px 0' }}>
              <TypingIndicator />
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: 'rgba(245,240,232,0.4)', fontStyle: 'italic', margin: '6px 0 0 30px' }}>
                Generating seasonal suggestions…
              </p>
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
              {suggestions.map((s, i) => {
                const uc = URGENCY_COLORS[s.urgency] || URGENCY_COLORS.MEDIUM
                return (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.gunmetal}44`,
                    borderLeft: `3px solid ${uc.text}`,
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: colors.warmWhite, lineHeight: 1.3 }}>{s.title}</span>
                          <span style={{
                            background: uc.bg, border: `1px solid ${uc.border}`,
                            borderRadius: 4, padding: '1px 5px',
                            fontFamily: 'ui-monospace, monospace', fontSize: 7,
                            color: uc.text, letterSpacing: '0.08em', flexShrink: 0,
                          }}>{s.urgency}</span>
                        </div>
                        <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: 'rgba(245,240,232,0.6)', lineHeight: 1.55, margin: 0 }}>{s.detail}</p>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, color: `${colors.amber}77`, letterSpacing: '0.06em', marginTop: 4, display: 'block' }}>{s.category}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: 'rgba(245,240,232,0.4)', fontStyle: 'italic', margin: '0 0 12px' }}>
                No suggestions available
              </p>
              <button
                onClick={fetchSuggestions}
                style={{
                  background: `${colors.amber}15`, border: `1px solid ${colors.amber}44`,
                  color: colors.amber, borderRadius: 8, padding: '6px 16px',
                  fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer',
                }}
              >Retry</button>
            </div>
          )}
        </div>
      )}

      {/* ══ MONITOR TAB ══ */}
      {activeTab === 'monitor' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {/* Upload categories */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: colors.gunmetal, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Upload Documents — AI will reference these in chat
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DOC_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setUploadCategory(cat.label); fileInputRef.current?.click() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.gunmetal}44`,
                    borderRadius: 8, padding: '5px 10px',
                    fontFamily: 'Georgia, serif', fontSize: 10,
                    color: 'rgba(245,240,232,0.65)', cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${colors.amber}18`; e.currentTarget.style.borderColor = `${colors.amber}55` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = `${colors.gunmetal}44` }}
                >
                  <span style={{ fontSize: 11 }}>{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,.csv,.rtf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Paste text option */}
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setPasteMode(p => !p)}
              style={{
                background: 'transparent', border: `1px solid ${colors.gunmetal}44`,
                color: colors.gunmetal, borderRadius: 6, padding: '4px 10px',
                fontFamily: 'ui-monospace, monospace', fontSize: 7.5, letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >{pasteMode ? '↑ Hide paste area' : '+ Paste text instead'}</button>

            {pasteMode && (
              <div style={{ marginTop: 8 }}>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.gunmetal}`, borderRadius: 6,
                    padding: '5px 8px', color: colors.warmWhite,
                    fontFamily: 'ui-monospace, monospace', fontSize: 9,
                    marginBottom: 6, boxSizing: 'border-box',
                  }}
                >
                  {DOC_CATEGORIES.map(c => <option key={c.id} value={c.label} style={{ background: '#1a1a18' }}>{c.label}</option>)}
                </select>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste your document text here…"
                  rows={4}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${colors.gunmetal}`, borderRadius: 8,
                    padding: '8px 10px', fontFamily: 'Georgia, serif', fontSize: 11,
                    color: colors.warmWhite, resize: 'vertical', outline: 'none',
                    boxSizing: 'border-box', caretColor: colors.amber,
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = colors.amber}
                  onBlur={e => e.currentTarget.style.borderColor = colors.gunmetal}
                />
                <button
                  onClick={addPastedDoc}
                  disabled={!pasteText.trim()}
                  style={{
                    marginTop: 6,
                    background: pasteText.trim() ? `${colors.amber}20` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${pasteText.trim() ? colors.amber + '55' : colors.gunmetal + '33'}`,
                    color: pasteText.trim() ? colors.amber : colors.gunmetal,
                    borderRadius: 6, padding: '5px 14px',
                    fontFamily: 'ui-monospace, monospace', fontSize: 8,
                    letterSpacing: '0.08em', cursor: pasteText.trim() ? 'pointer' : 'default',
                  }}
                >Add to Documents</button>
              </div>
            )}
          </div>

          {/* Uploaded docs list */}
          {documents.length > 0 ? (
            <div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: `${colors.amber}99`, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Active ({documents.length}) — Referenced in ASK tab
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: `${colors.amber}10`, border: `1px solid ${colors.amber}33`,
                    borderRadius: 8, padding: '7px 10px',
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>
                      {DOC_CATEGORIES.find(c => c.label === doc.category)?.icon || '📎'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: 10, color: colors.warmWhite, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 7, color: `${colors.amber}88`, letterSpacing: '0.06em' }}>{doc.category}</div>
                    </div>
                    <button
                      onClick={() => setDocuments(d => d.filter(x => x.id !== doc.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: `${colors.gunmetal}88`, fontSize: 16, padding: '0 2px', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: 'rgba(245,240,232,0.35)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                Upload your lease, utility bills, or inspection reports.<br/>The AI will reference them when you ask questions in the ASK tab.
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
