# Mainten — AI Property Intelligence for Renters

> **Live demo:** [mainten-demo.vercel.app](https://mainten-demo.vercel.app)

Mainten gives renters instant, AI-powered insight into their building's real condition — before they sign a lease or the moment something goes wrong. Built on Boston's public property data and powered by **Google Gemini**.

---

## What It Does

1. **Search any Boston address** → map flies to the property
2. **AI analyses real data** — Boston Assessor records, ISD permit history, building age — and surfaces the 5 things a renter most needs to know
3. **Choose your role** (Tenant / Owner) and enter your unit number → the floor plan highlights just your unit
4. **Click any room** on the interactive floor plan → AI chat opens, specific to that room
5. **Ask anything** — "my tap is loose", "is there mould safe?", "is this landlord's fault?" — Gemini answers in plain English
6. **Can I?** — quick questions like "can I drill into the walls?" or "can I paint?" answered with property-specific context
7. **Report an issue** → AI generates a professional diagnosis + job brief you can send to your landlord

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, inline styles |
| Map | Mapbox GL JS (dark theme, weather-reactive) |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Property Data | Boston Assessor CKAN API · ISD Permits API |
| Hosting | Vercel (serverless functions + static frontend) |

---

## Data Sources (All Real, All Public)

| Data | Source |
|---|---|
| Year built, condition, units, heat system | Boston Assessor Database (CKAN) |
| Permit history | ISD Building Permits Open Data |
| Weather overlay | Open-Meteo API |
| Map & geocoding | Mapbox |

Everything shown is derived from real Boston public records — not generated or made up.

---

## App Flow

```
Search
  └─▶ Address entered
        └─▶ Map flies to location
              └─▶ Property Intelligence panel (Gemini analyses real data)
                    └─▶ "Start Maintening" clicked
                          └─▶ Onboarding (role + unit number)
                                └─▶ House Profile
                                      ├─ Interactive floor plan (unit-filtered)
                                      ├─ Condition score + plain-English key facts
                                      ├─ Can I? panel
                                      └─ Room chat (Gemini, context-aware)
```

---

## Running Locally

```bash
# Clone
git clone https://github.com/hvasisht/mainten-demo.git
cd mainten-demo

# Install root deps (API functions)
npm install

# Install + run frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# API functions need a local server (optional)
cd ../backend
npm install
cp .env.example .env    # add GEMINI_API_KEY
node server.js
# → http://localhost:3001
```

For the full Vercel experience including live AI, the app needs a `GEMINI_API_KEY` environment variable set in Vercel dashboard.

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GEMINI_API_KEY` | Vercel env / `.env` | Google Gemini API key |
| `VITE_MAPBOX_TOKEN` | `frontend/.env` | Mapbox public token |

---

## Project Structure

```
mainten-demo/
├── api/                        # Vercel serverless functions
│   ├── _helpers.js             # Gemini client, prompts, demo fallbacks
│   ├── property.js             # GET /api/property — Boston Assessor data
│   ├── insights.js             # POST /api/insights — Gemini property analysis
│   ├── chat.js                 # POST /api/chat — Gemini room chat
│   ├── cani.js                 # POST /api/cani — "Can I?" answers
│   └── diagnose.js             # POST /api/diagnose — issue diagnosis
│
├── backend/
│   ├── server.js               # Local Express server (mirrors API functions)
│   └── src/
│       └── bostonData.js       # Boston Assessor + ISD permits data layer
│
├── frontend/src/
│   ├── components/
│   │   ├── AhaPanel.jsx        # Property Intelligence panel (insights)
│   │   ├── ChatPanel.jsx       # Per-room AI chat
│   │   ├── TripleDeckerMap.jsx # Interactive SVG floor plan
│   │   ├── PropertyDashboard.jsx # Condition score + Key Facts + Can I?
│   │   ├── ConditionScore.jsx  # Animated score ring
│   │   ├── CanIPanel.jsx       # Quick question panel
│   │   ├── IssueReporter.jsx   # Issue reporting + AI diagnosis
│   │   ├── OnboardingOverlay.jsx # Role + unit selection
│   │   └── SearchBar.jsx       # Mapbox address search
│   └── pages/
│       └── Home.jsx            # Main app state machine
│
└── vercel.json                 # Build config + API rewrites
```

---

## Key Features

### Unit-Aware Floor Plan
After onboarding, if you enter your unit/floor number, the floor plan dims all other floors and labels yours "YOUR UNIT". Rooms on your floor are fully interactive.

### Gemini-Powered Chat
Each room has its own chat backed by Gemini 2.5 Flash. The AI:
- Knows the property's real age, heat system, and construction type
- Knows Massachusetts Sanitary Code (105 CMR 410) for tenant rights
- **Never gives contacts/phone numbers unless you explicitly ask**
- Maintains full conversation history within a session

### Graceful Demo Mode
If the Gemini API key is missing or over quota, all 4 AI endpoints fall back to pre-computed, realistic responses. The demo always works.

---

## Demo Addresses That Work Well

Any pre-1920 Boston address works. Good ones:

- **6 Moreland Street, Boston** — 1905 triple-decker, Gemini/Jamaica Plain area
- **14 Winthrop Street, Cambridge** — pre-war, well-documented permits
- Any address in Dorchester, Jamaica Plain, Roxbury, Allston

---

## Built For

Google GenAI Expo — May 2025
Demonstrating real-world AI + public data integration for urban housing.

---

## License

MIT
