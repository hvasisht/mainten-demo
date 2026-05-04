import { useState, useCallback } from 'react'
import MapBackground from '../components/MapBackground'
import SearchBar from '../components/SearchBar'
import WeatherOverlay from '../components/WeatherOverlay'
import AhaPanel from '../components/AhaPanel'
import OnboardingOverlay from '../components/OnboardingOverlay'
import TripleDeckerMap from '../components/TripleDeckerMap'
import ChatPanel from '../components/ChatPanel'
import IssueReporter from '../components/IssueReporter'
import useWeather from '../hooks/useWeather'
import { colors } from '../tokens'

// ──────────────────────────────────────────────────────────────
//  APP STATES
//  search    → map + search bar (initial)
//  insights  → Aha moment panel loading (after address entered)
//  onboarding→ role selection overlay
//  profile   → house profile: floor plan + chat
// ──────────────────────────────────────────────────────────────

export default function Home() {
  const [appState, setAppState]           = useState('search')
  const [flyTo, setFlyTo]                 = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [propertyData, setPropertyData]   = useState(null)

  // Profile state
  const [activeElement, setActiveElement] = useState(null)
  const [chatVisible, setChatVisible]     = useState(false)
  const [issueElement, setIssueElement]   = useState(null)
  const [issueVisible, setIssueVisible]   = useState(false)

  const weather = useWeather()

  // ── Address selected from search ──
  const handleAddressSelect = useCallback((feature) => {
    const [lng, lat] = feature.center
    setFlyTo({ lng, lat })
    setSelectedAddress(feature.place_name)
    setPropertyData(null)
    setAppState('insights')
  }, [])

  // ── "Start Maintening" clicked from AhaPanel ──
  const handleStartMaintening = useCallback((data) => {
    setPropertyData(data)
    setAppState('onboarding')
  }, [])

  // ── Onboarding complete ──
  const handleOnboardingComplete = useCallback(() => {
    setAppState('profile')
    setChatVisible(false)
    setActiveElement(null)
  }, [])

  // ── Element tapped on floor plan ──
  const handleElementClick = useCallback((el) => {
    setActiveElement(el)
    setIssueVisible(false)
    setChatVisible(true)
  }, [])

  // ── Report issue ──
  const handleReportIssue = useCallback((el) => {
    setIssueElement(el)
    setIssueVisible(true)
  }, [])

  // ── Back to search ──
  const handleReset = useCallback(() => {
    setAppState('search')
    setSelectedAddress(null)
    setPropertyData(null)
    setFlyTo(null)
    setActiveElement(null)
    setChatVisible(false)
    setIssueVisible(false)
  }, [])

  const inProfile = appState === 'profile'
  const inInsights = appState === 'insights'

  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.cityDeep }}>

      {/* ─── MAP (always visible) ─── */}
      <MapBackground
        flyTo={flyTo}
        weather={weather}
        onBuildingFound={() => {}}
      />
      <WeatherOverlay weather={weather} />

      {/* ─── VIGNETTES ─── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.55) 80%)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* ─── SEARCH BAR (visible in search + insights states) ─── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 2, padding: '0 40px',
        pointerEvents: 'none',
        opacity: inProfile ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          pointerEvents: inProfile ? 'none' : 'all',
          width: '100%', maxWidth: 680,
        }}>
          {/* MAINTEN wordmark */}
          <div
            onClick={inInsights ? handleReset : undefined}
            style={{
              flexShrink: 0,
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 'clamp(14px, 1.6vw, 20px)',
              fontWeight: 700,
              letterSpacing: '0.28em',
              color: colors.amber,
              textTransform: 'uppercase',
              textShadow: `0 0 30px ${colors.amber}44`,
              cursor: inInsights ? 'pointer' : 'default',
            }}>
            MAINTEN
          </div>
          <div style={{ flex: 1 }}>
            <SearchBar
              onFlyTo={setFlyTo}
              onAddressSelect={handleAddressSelect}
            />
          </div>
        </div>

        {/* Subtitle */}
        {!selectedAddress && (
          <div style={{
            marginTop: 14,
            width: '100%', maxWidth: 680,
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: 'Georgia, serif',
              fontSize: 13,
              color: 'rgba(200,180,120,0.55)',
              letterSpacing: '0.02em',
              fontStyle: 'italic',
            }}>
              AI-powered property intelligence for renters.
            </span>
          </div>
        )}

        {/* Address pill */}
        {selectedAddress && (
          <div style={{
            marginTop: 10, width: '100%', maxWidth: 680,
            paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 8,
            pointerEvents: 'none',
          }}>
            <span style={{ color: colors.amber, fontSize: 11 }}>⌖</span>
            <span style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 11, letterSpacing: '0.06em',
              color: 'rgba(200,180,120,0.75)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {selectedAddress}
            </span>
          </div>
        )}
      </div>

      {/* ─── AHA PANEL (insights state) ─── */}
      <AhaPanel
        address={selectedAddress}
        visible={inInsights}
        onStartMaintening={handleStartMaintening}
      />

      {/* ─── ONBOARDING OVERLAY ─── */}
      <OnboardingOverlay
        address={selectedAddress}
        visible={appState === 'onboarding'}
        onComplete={handleOnboardingComplete}
      />

      {/* ─── PROFILE: MAINTEN WORDMARK TOP-LEFT ─── */}
      {inProfile && (
        <div style={{
          position: 'absolute', top: 24, left: 40, zIndex: 12,
          display: 'flex', alignItems: 'center', gap: 16,
          animation: 'fadeIn 0.5s ease forwards',
        }}>
          <div style={{
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 16, fontWeight: 700, letterSpacing: '0.28em',
            color: colors.amber, textTransform: 'uppercase',
            textShadow: `0 0 24px ${colors.amber}44`,
          }}>
            MAINTEN
          </div>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 9,
            color: colors.gunmetal, letterSpacing: '0.06em',
          }}>
            {selectedAddress?.split(',')[0]}
          </div>
          <button
            onClick={handleReset}
            style={{
              background: 'none', border: `1px solid ${colors.gunmetal}`,
              borderRadius: 6, padding: '3px 10px',
              fontFamily: 'ui-monospace, monospace', fontSize: 8,
              letterSpacing: '0.1em', color: colors.gunmetal,
              cursor: 'pointer', textTransform: 'uppercase',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.amber; e.currentTarget.style.color = colors.amber }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.gunmetal; e.currentTarget.style.color = colors.gunmetal }}
          >
            ← New Search
          </button>
        </div>
      )}

      {/* ─── PROFILE: TRIPLE-DECKER FLOOR PLAN ─── */}
      <TripleDeckerMap
        address={selectedAddress}
        propertyData={propertyData}
        activeElement={activeElement}
        onElementClick={handleElementClick}
        visible={inProfile}
      />

      {/* ─── PROFILE: CHAT PANEL ─── */}
      <ChatPanel
        element={activeElement}
        propertyData={propertyData}
        visible={inProfile && chatVisible}
        onClose={() => setChatVisible(false)}
        onReportIssue={handleReportIssue}
      />

      {/* ─── ISSUE REPORTER ─── */}
      <IssueReporter
        element={issueElement}
        propertyData={propertyData}
        visible={issueVisible}
        onClose={() => setIssueVisible(false)}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
