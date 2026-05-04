import { useState, useEffect, useRef } from 'react'
import { colors } from '../tokens'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const DEBOUNCE_MS = 350

export default function SearchBar({ onFlyTo, onAddressSelect }) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!value.trim() || value.length < 3) { setSuggestions([]); setActiveIndex(-1); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&country=US&types=address&proximity=-71.0589,42.3601&limit=5`
        const res = await fetch(url)
        const data = await res.json()
        setSuggestions(data.features ?? [])
        setActiveIndex(-1)
      } catch (_) {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  function handleSelect(feature) {
    setValue(feature.place_name)
    setSuggestions([])
    setActiveIndex(-1)
    const [lng, lat] = feature.center
    onFlyTo?.({ lng, lat })
    onAddressSelect?.(feature)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const target = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0]
    if (target) handleSelect(target)
  }

  function handleKeyDown(e) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    }
  }

  const borderRadius = '12px'
  const dropdownRadius = '0 0 12px 12px'
  const showDropdown = focused && suggestions.length > 0

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(212, 146, 10, 0.12)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1.5px solid ${focused ? colors.amber : 'rgba(212,146,10,0.35)'}`,
          borderRadius: showDropdown ? '12px 12px 0 0' : borderRadius,
          boxShadow: focused
            ? `0 0 0 3px ${colors.amber}38, 0 20px 60px rgba(0,0,0,0.6)`
            : '0 20px 60px rgba(0,0,0,0.5)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          minHeight: 56,
          position: 'relative',
        }}>

          {/* Input wrapper */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            {/* Colored placeholder */}
            {!value && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 18,
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                fontSize: 15,
              }}>
                <span style={{ color: colors.gunmetal }}>What's </span>
                <span style={{ color: colors.amber, margin: '0 4px' }}>your home</span>
                <span style={{ color: colors.gunmetal }}> address?</span>
              </div>
            )}
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck="false"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'Georgia, serif',
                fontSize: 15,
                color: '#F5F0E8',
                padding: value ? '18px 52px 18px 18px' : '18px 18px 18px 18px',
                caretColor: colors.amber,
              }}
            />
            {/* Right fade */}
            {value && (
              <div style={{
                position: 'absolute',
                top: 0, right: 44, bottom: 0,
                width: 60,
                background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08))',
                pointerEvents: 'none',
              }} />
            )}
          </div>

          {/* Floating search icon — only when typing */}
          {value && (
            <button
              type="submit"
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                opacity: 0.8,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
            >
              {loading
                ? <span style={{ fontSize: 12, color: colors.amber, fontWeight: 700 }}>…</span>
                : <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
                    <circle cx="6.5" cy="6.5" r="4.5" stroke={colors.amber} strokeWidth="1.8"/>
                    <line x1="10" y1="10" x2="13.5" y2="13.5" stroke={colors.amber} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
              }
            </button>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'rgba(20, 18, 14, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1.5px solid ${colors.amber}`,
          borderTop: `1px solid ${colors.gunmetal}`,
          borderRadius: dropdownRadius,
          overflow: 'hidden',
          zIndex: 100,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}>
          {suggestions.map((f, i) => (
            <button
              key={f.id}
              onMouseDown={() => handleSelect(f)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '13px 18px',
                background: i === activeIndex ? '#38352e' : 'transparent',
                border: 'none',
                borderTop: i > 0 ? `1px solid #3a3830` : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#38352e'}
              onMouseLeave={e => e.currentTarget.style.background = i === activeIndex ? '#38352e' : 'transparent'}
            >
              <span style={{ color: colors.amber, fontSize: 13, flexShrink: 0 }}>⌖</span>
              <div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#F5F0E8', lineHeight: 1.3 }}>
                  {f.text}
                </div>
                <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, color: colors.gunmetal, marginTop: 2, letterSpacing: '0.04em' }}>
                  {f.place_name.replace(f.text + ', ', '')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
