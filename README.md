# Mainten — Keep Your Home at 10
## AI-Powered Home Operating System — Demo Build

---

## Quick Start

```bash
cd /Users/harinivasisht/Downloads/Mainten-build
./start.sh
# Opens http://localhost:5173
```

---

## Adding Your Claude API Key

Open `backend/.env` and replace `your_anthropic_api_key_here` with your real key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Restart the backend. With a real key: Claude generates live, property-specific insights.
Without a key: Pre-computed demo insights for any address (great for the Google demo).

---

## App States (Demo Flow)

| State | What Happens |
|---|---|
| **Search** | Dark Boston map, search bar centred. Enter any address. |
| **Insights (Aha Moment)** | Map flies to address. 5 AI property insights load sequentially. |
| **Onboarding** | Role selection (Tenant / Owner / Both). Optional move-in details. |
| **House Profile** | Triple-decker floor plan with 6 tappable elements + AI chat. |

---

## Demo Address (for Google Cambridge)

Enter any pre-1920 Cambridge or Boston address. Suggested:
- **14 Winthrop Street, Boston** — 1890 triple-decker, well-documented
- Any address in Dorchester, Jamaica Plain, Cambridge

---

## What's Built

### Frontend Components
| File | What it does |
|---|---|
| `AhaPanel.jsx` | Property intelligence card with 5 sequential AI insights + "Start Maintening" |
| `TripleDeckerMap.jsx` | SVG triple-decker floor plan with 6 tappable pulsing elements |
| `ChatPanel.jsx` | Sliding AI conversation panel per element, with suggested questions |
| `IssueReporter.jsx` | Full issue reporting: describe → diagnose → job brief (copyable) |
| `OnboardingOverlay.jsx` | Role selection + move-in details |
| `MapBackground.jsx` | Live Mapbox dark map, weather-reactive, auto-pan |
| `SearchBar.jsx` | Mapbox geocoding with Boston proximity bias |
| `KnownInsights.jsx` | Raw Boston Assessor data panel (kept, not shown in main flow) |

### Backend Endpoints
| Endpoint | Does |
|---|---|
| `GET /api/property?address=...` | Returns Boston Assessor + permit data |
| `POST /api/insights` | Claude → 5 property insights (falls back to demo if no key) |
| `POST /api/chat` | Claude conversation with element + property context |
| `POST /api/diagnose` | AI diagnosis + landlord/tenant responsibility + job brief |

---

## Architecture

```
Frontend (React + Vite)          Backend (Express + Node.js)
    localhost:5173          →        localhost:3001
    /api/* (Vite proxy)     →    server.js
                                     ├── bostonData.js (Boston Assessor API)
                                     ├── Claude API (@anthropic-ai/sdk)
                                     └── Demo fallback (pre-computed insights)
```

---

## Google Demo Checklist (May 7)

- [ ] Add Anthropic API key to `backend/.env` for live Claude responses
- [ ] Pick a Cambridge address (pre-1920 triple-decker) and test it beforehand
- [ ] Run `./start.sh` — verifies both servers, opens browser
- [ ] If API fails mid-demo: demo fallback kicks in automatically — nobody will know
- [ ] Have the address ready to type live — don't copy-paste, type it in front of them

---

## Presentation Flow (10 min)

**Min 1** — Problem: "43M US renters, zero visibility into their building's real condition."

**Min 2-3** — Brief: Show the concept — spatial memory, AI advisor, transferable profile.

**Min 4-8** — Live demo:
1. Type address → watch map fly → see insights load one by one
2. Click "Start Maintening" → role selection → floor plan
3. Tap the boiler → ask "is this safe?" → see AI respond with property-specific knowledge
4. Tap "Report Issue" → type a problem → watch diagnosis + job brief generate
5. Say almost nothing. Let them watch.

**Min 9-10** — Market: Boston beachhead. $9.99/mo. 93% gross margin. Data moat + network effect + trust flywheel. "The technology exists. The data is public. Nobody connected the dots until now."

---

## Pricing

| Tier | Price | Who |
|---|---|---|
| Free | $0 | Aha moment (always free) |
| Plus | $9.99/mo | Tenants / homeowners |
| Pro | $19.99/unit/mo | Landlords |

**Unit economics: $9.99 revenue → $0.65 AI cost → ~93% gross margin**
