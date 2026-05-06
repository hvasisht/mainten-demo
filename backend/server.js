require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { GoogleAIFileManager } = require('@google/generative-ai/server')
const { getPropertyData } = require('./src/bostonData')

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

const upload = multer({ dest: require('os').tmpdir() })

const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const HAS_API_KEY = GEMINI_KEY.length > 10 && !GEMINI_KEY.startsWith('your_')
const genAI = HAS_API_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null

async function geminiGenerate(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

async function geminiChat(systemInstruction, messages) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction })
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const chat = model.startChat({ history })
  const result = await chat.sendMessage(messages[messages.length - 1].content)
  return result.response.text().trim()
}

function stripJson(text) {
  return text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
}

// ──────────────────────────────────────────────────────────────
//  DEMO CACHE — pre-computed fallback for a Cambridge address
// ──────────────────────────────────────────────────────────────
const DEMO_INSIGHTS = [
  {
    category: 'Electrical',
    status: 'RISK',
    headline: 'Knob-and-tube wiring probable in walls',
    detail: 'Built 1914 — electrical wiring predates modern standards. Any permit on record likely upgraded the service panel only. Original knob-and-tube wiring in wall cavities is typical for this era and is not covered by modern insurance.',
    icon: '⚡',
  },
  {
    category: 'Plumbing',
    status: 'INFERRED',
    headline: 'Galvanised iron pipes likely throughout',
    detail: 'No recent plumbing permit found. After 110+ years, galvanised iron pipes develop interior corrosion that reduces water pressure, discolours water, and eventually leads to pinhole leaks. Replacement cost averages $8,000–$15,000.',
    icon: '🔧',
  },
  {
    category: 'Lead Paint',
    status: 'PROBABLE',
    headline: 'Lead paint assumed present',
    detail: 'Built 64 years before the 1978 federal lead paint ban. Massachusetts law requires disclosure and deleading for units with children under 6. Assume lead paint on all original painted surfaces until professionally tested.',
    icon: '⚠',
  },
  {
    category: 'Structure',
    status: 'CONFIRMED',
    headline: 'Balloon frame — fire spreads between floors',
    detail: 'Pre-1940 triple-decker construction uses balloon framing with continuous wall cavities from basement to roof. Fire travels between floors in under 90 seconds without fire blocking. Verify working smoke detectors on every level.',
    icon: '🔥',
  },
  {
    category: 'Roof',
    status: 'MONITOR',
    headline: 'Roof age approaching replacement window',
    detail: 'Asphalt shingle roofs on Boston triple-deckers typically last 20–25 years. Check for curling shingles, granule loss in gutters, or soft spots — signs that replacement may be needed within 5 years.',
    icon: '🏠',
  },
]

// ──────────────────────────────────────────────────────────────
//  DEMO SUGGESTIONS — seasonal spring fallback
// ──────────────────────────────────────────────────────────────
const DEMO_SUGGESTIONS = [
  { icon: '🌧', title: 'Clear roof drains before spring rains', detail: 'Boston averages 4 inches of rain in April. Clear flat roof drains to prevent ponding and top-floor ceiling leaks — landlord responsibility under 105 CMR 410.', urgency: 'HIGH', category: 'Roof' },
  { icon: '🐀', title: 'Seal foundation gaps before pest season', detail: 'Rodent activity surges in spring. Gaps larger than ¼ inch around pipes and vents are entry points — report to landlord in writing, required under 105 CMR 410.550.', urgency: 'HIGH', category: 'Pests' },
  { icon: '🔋', title: 'Test smoke and CO detectors now', detail: 'MA requires smoke detectors on every level and CO detectors within 10ft of sleeping areas. Test all units and replace batteries. Notify landlord if any are missing.', urgency: 'HIGH', category: 'Safety' },
  { icon: '🌡', title: 'Request boiler service record', detail: 'Annual boiler maintenance (blowdown, trap inspection, pressure relief test) should happen at end of heating season. Ask your landlord when it was last serviced.', urgency: 'MEDIUM', category: 'Heating' },
  { icon: '🪟', title: 'Check window seals as humidity rises', detail: 'Original wood frames in pre-war buildings expand in spring. Inspect glazing compound and caulk for gaps — these allow water and pest entry.', urgency: 'MEDIUM', category: 'Windows' },
  { icon: '💧', title: 'Check ceilings for ice dam water stains', detail: 'Winter ice dams leave moisture stains visible in spring. Document any new ceiling stains with timestamped photos — landlord must address structural water damage.', urgency: 'MEDIUM', category: 'Water' },
]

function buildSuggestionsPrompt(propertyData, userProfile) {
  const a = propertyData?.assessor || {}
  const month = new Date().getMonth() + 1
  const season = month >= 3 && month <= 5 ? 'Spring' : month >= 6 && month <= 8 ? 'Summer' : month >= 9 && month <= 11 ? 'Fall' : 'Winter'
  return `You are Mainten AI. Generate 6 property maintenance suggestions for a Boston renter in ${season} ${new Date().getFullYear()}.

PROPERTY:
Address: ${propertyData?.address || 'Boston, MA'}
Year Built: ${a.yearBuilt || 'unknown'}
Type: ${a.luDesc || 'Residential'} · ${propertyData?.units?.count || 3} units
Heat: ${a.heatType || 'Unknown'} / ${a.heatSystem || 'Unknown'}
Roof: ${a.roofStructure || 'Unknown'} / ${a.roofCover || 'Unknown'}
${userProfile ? `Tenant: ${userProfile.role || 'Renter'}, Floor: ${userProfile.floor || 'Unknown'}` : ''}

Generate exactly 6 seasonally-relevant suggestions for a pre-war Boston building. Cover safety, weatherization, pest prevention, systems checks, and landlord vs tenant responsibilities. Reference MA Sanitary Code (105 CMR 410) where relevant.

Respond with ONLY a JSON array, no markdown:
[{"icon":"🌧","title":"Action title max 8 words","detail":"2-3 sentences. Specific and actionable. Reference landlord vs tenant responsibility.","urgency":"HIGH","category":"Roof"}]

Urgency: HIGH | MEDIUM | LOW`
}

// ──────────────────────────────────────────────────────────────
//  PROPERTY INTELLIGENCE PROMPT
// ──────────────────────────────────────────────────────────────
function buildInsightPrompt(propertyData) {
  const a = propertyData.assessor || {}
  const p = propertyData.permits || {}
  const yearBuilt = a.yearBuilt || 'unknown'
  const age = yearBuilt !== 'unknown' ? (new Date().getFullYear() - parseInt(yearBuilt)) : null
  const permitList = (p.records || []).slice(0, 10)
    .map(r => `${r.issuedDate?.slice(0, 4) || '?'}: ${r.type} — ${r.description || 'No description'}`)
    .join('\n')

  return `You are Mainten, an AI property intelligence system. Analyse this Boston property and generate exactly 5 insights that a renter needs to know about the real condition of their home.

PROPERTY DATA:
Address: ${propertyData.address}
Year Built: ${yearBuilt}${age ? ` (${age} years old)` : ''}
Building Type: ${a.luDesc || 'Residential'}
Structure Class: ${a.structureClass || 'Unknown'}
Units: ${propertyData.units?.count || 'Unknown'}
Gross Area: ${a.grossArea ? `${a.grossArea} sq ft` : 'Unknown'}
Heat Type: ${a.heatType || 'Unknown'}
Heat System: ${a.heatSystem || 'Unknown'}
Roof Structure: ${a.roofStructure || 'Unknown'}
Roof Cover: ${a.roofCover || 'Unknown'}
Exterior Finish: ${a.extFinish || 'Unknown'}
Overall Condition: ${a.overallCond || 'Unknown'}
External Condition: ${a.extCond || 'Unknown'}

PERMIT HISTORY (${p.total || 0} total permits on record):
${permitList || 'No permits found'}

Permit flags: Boiler/heating: ${p.summary?.hasBoiler ? 'YES' : 'No'} | Electrical: ${p.summary?.hasElectric ? 'YES' : 'No'} | Plumbing: ${p.summary?.hasPlumbing ? 'YES' : 'No'} | Roof: ${p.summary?.hasRoof ? 'YES' : 'No'}

Generate exactly 5 insights. Cover: construction era risks (wiring, pipes, lead paint), structural type, and at least one positive or monitored item if warranted.

Respond with ONLY a valid JSON array, no markdown, no preamble:
[
  {
    "category": "Electrical",
    "status": "RISK",
    "headline": "Short specific headline (max 8 words)",
    "detail": "2-3 sentences. Be specific to this property — year built, permit dates, actual materials inferred. Never generic. Always actionable.",
    "icon": "⚡"
  }
]

Status values: RISK | INFERRED | PROBABLE | CONFIRMED | MONITOR | CLEAR
Icons: ⚡ for electrical, 🔧 for plumbing, ⚠ for hazards, 🔥 for structural/fire, 🏠 for roof/exterior, 🌡 for heating, ✓ for clear items`
}

// ──────────────────────────────────────────────────────────────
//  BOSTON SERVICE CONTACTS
// ──────────────────────────────────────────────────────────────
const BOSTON_CONTACTS = {
  pest: {
    label: 'Pest Control / Exterminator',
    providers: [
      { name: 'JP Pest Services',      phone: '1-800-222-2908', note: 'Covers Boston metro, same-day available' },
      { name: "Slade's Pest Control",  phone: '(617) 327-0500', note: 'Family-run, South Boston based' },
      { name: 'Catseye Pest Control',  phone: '(617) 340-1001', note: 'Rodent exclusion specialists' },
    ],
  },
  plumbing: {
    label: 'Licensed Plumber',
    providers: [
      { name: 'Boston Standard Company',   phone: '(617) 288-2911', note: '24/7 emergency, licensed & insured' },
      { name: 'G&C Plumbing & Heating',    phone: '(617) 323-2422', note: 'Boston family-owned since 1958' },
      { name: 'Rooter-Man Boston',         phone: '(617) 396-1550', note: 'Drain, sewer, pipe repairs' },
    ],
  },
  electrical: {
    label: 'Licensed Electrician',
    providers: [
      { name: 'APlus Electric',              phone: '(617) 765-7550', note: 'Licensed, Boston metro' },
      { name: 'Century Electrical Services', phone: '(617) 782-0993', note: 'Knob-and-tube remediation specialist' },
    ],
  },
  hvac: {
    label: 'HVAC / Boiler Service',
    providers: [
      { name: 'Boston Standard Company', phone: '(617) 288-2911', note: 'Boiler service, steam systems, 24/7' },
      { name: 'New England Mechanical',  phone: '(781) 935-1488', note: 'Residential & commercial HVAC' },
    ],
  },
  roofing: {
    label: 'Roofer',
    providers: [
      { name: 'Unified Roofing',      phone: '(617) 848-4755', note: 'Flat roof specialists, Boston triple-deckers' },
      { name: 'Mass Roofing & Siding', phone: '(617) 698-2415', note: 'Licensed, free inspections' },
    ],
  },
  general: {
    label: 'General Contractor',
    providers: [
      { name: 'BuildZoom Boston', phone: 'buildzoom.com',  note: 'Vetted contractors with license checks' },
      { name: 'Angi',             phone: 'angi.com',       note: 'Get 3 competing quotes from local pros' },
    ],
  },
  tenant: {
    label: 'Tenant Rights / Legal Help',
    providers: [
      { name: 'Greater Boston Legal Services',  phone: '(617) 603-1700', note: 'Free legal help for low-income tenants' },
      { name: 'Boston Tenant Coalition',        phone: '(617) 522-2800', note: 'Tenant advocacy & resources' },
      { name: 'MA AG Housing Hotline',          phone: '(617) 963-2197', note: 'File complaints about housing conditions' },
    ],
  },
}

function contactsBlock() {
  return Object.values(BOSTON_CONTACTS).map(cat =>
    `${cat.label}:\n` +
    cat.providers.map(p => `  • ${p.name} — ${p.phone} (${p.note})`).join('\n')
  ).join('\n\n')
}

// ──────────────────────────────────────────────────────────────
//  ELEMENT CHAT PROMPT
// ──────────────────────────────────────────────────────────────
function buildChatSystemPrompt(propertyData, element, documents) {
  const a = propertyData?.assessor || {}
  const yearBuilt = a.yearBuilt || 'unknown'

  let docSection = ''
  if (documents && documents.length > 0) {
    docSection = '\n\nTENANT\'S UPLOADED DOCUMENTS (reference these when answering questions about their specific lease terms, utility costs, inspection findings, etc.):\n' +
      documents.map(d => `--- ${d.category}: ${d.name} ---\n${d.content}`).join('\n\n')
  }

  return `You are Mainten AI — an expert property advisor for Boston residents. You can answer ANY question about this property, home maintenance, tenant rights, or finding help.

PROPERTY CONTEXT:
- Address: ${propertyData?.address || 'Unknown'}
- Year Built: ${yearBuilt}
- Building Type: ${a.luDesc || 'Residential'}
- Heat Type: ${a.heatType || 'Unknown'}
- Structure: ${a.structureClass || 'Unknown'}
- Units: ${propertyData?.units?.count || 'Unknown'}
- Currently discussing: ${element.name}
- Element context: ${element.context}${docSection}

BOSTON SERVICE PROVIDERS (use these when the user asks for contacts, who to call, or how to fix something):
${contactsBlock()}

RULES:
- Answer the user's ACTUAL QUESTION directly — do not default to generic element info
- If documents are uploaded, reference them specifically when the question relates to lease terms, bills, or inspection findings
- If they ask for a contact, contractor, or "who to call" → provide the relevant providers above with name and phone number
- If they ask about pest issues (rats, mice, cockroaches, bugs) → recommend pest control contacts
- If they ask about a repair → advise whether it's landlord vs tenant responsibility, then give contacts
- Always reference this specific property (year built, construction era, building type)
- Be direct and practical — this is a renter making real decisions
- Keep responses under 200 words
- Never start with "Great question" or filler`
}

// ──────────────────────────────────────────────────────────────
//  DIAGNOSIS PROMPT
// ──────────────────────────────────────────────────────────────
function buildDiagnosisPrompt(propertyData, element, issue) {
  const a = propertyData?.assessor || {}
  return `You are Mainten AI diagnosing a property issue.

Property: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
Building type: ${a.luDesc || 'Residential'}, ${propertyData?.units?.count || '?'} units
Heat: ${a.heatType || 'Unknown'} / ${a.heatSystem || 'Unknown'}
Overall condition: ${a.overallCond || 'Unknown'}

Element affected: ${element.name}
Issue reported: "${issue}"

Respond with a JSON object ONLY, no markdown:
{
  "diagnosis": "Clear 2-3 sentence diagnosis specific to this property type and age",
  "responsibility": "LANDLORD" | "TENANT" | "SHARED",
  "responsibilityReason": "One sentence explaining why under Massachusetts Sanitary Code",
  "urgency": "URGENT" | "SOON" | "MONITOR",
  "urgencyReason": "One sentence",
  "jobBrief": "Professional job description for a tradesperson. Include: property type, construction era, what the problem is, what access is needed, special notes for this building type. 3-4 sentences.",
  "diyPossible": true | false,
  "diyNote": "If diy=true: brief safe DIY instructions. If false: why professional is needed."
}`
}

// ──────────────────────────────────────────────────────────────
//  ROUTES
// ──────────────────────────────────────────────────────────────

// GET /api/property?address=14+Winthrop+St...
app.get('/api/property', async (req, res) => {
  const { address } = req.query
  if (!address) return res.status(400).json({ error: 'address required' })
  try {
    const data = await getPropertyData(address)
    res.json(data)
  } catch (err) {
    console.error('Property fetch error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/insights
// Body: { propertyData }
// Returns: { insights: [...] }
app.post('/api/insights', async (req, res) => {
  const { propertyData } = req.body
  if (!propertyData) return res.status(400).json({ error: 'propertyData required' })

  // No API key → return demo data immediately
  if (!HAS_API_KEY) {
    console.log('[insights] No API key — returning demo fallback')
    return res.json({ insights: DEMO_INSIGHTS, source: 'demo' })
  }

  try {
    const text = await geminiGenerate(buildInsightPrompt(propertyData))
    const insights = JSON.parse(stripJson(text))
    res.json({ insights, source: 'gemini' })
  } catch (err) {
    console.error('[insights] Gemini error — falling back to demo:', err.message)
    res.json({ insights: DEMO_INSIGHTS, source: 'fallback' })
  }
})

// POST /api/suggestions
// Body: { propertyData, userProfile }
// Returns: { suggestions: [...] }
app.post('/api/suggestions', async (req, res) => {
  const { propertyData, userProfile } = req.body

  if (!HAS_API_KEY) {
    return res.json({ suggestions: DEMO_SUGGESTIONS, source: 'demo' })
  }

  try {
    const text = await geminiGenerate(buildSuggestionsPrompt(propertyData, userProfile))
    const suggestions = JSON.parse(stripJson(text))
    res.json({ suggestions, source: 'gemini' })
  } catch (err) {
    console.error('[suggestions]', err.message)
    res.json({ suggestions: DEMO_SUGGESTIONS, source: 'fallback' })
  }
})

// POST /api/chat
// Body: { messages: [{role, content}], propertyData, element: {name, context}, documents }
// Returns: { reply }
app.post('/api/chat', async (req, res) => {
  const { messages, propertyData, element, documents } = req.body
  if (!messages || !element) return res.status(400).json({ error: 'messages and element required' })

  if (!HAS_API_KEY) {
    // Read the actual user question
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content?.toLowerCase() || ''
    const address = propertyData?.address || 'this property'
    const year = propertyData?.assessor?.yearBuilt || '1914'

    function fmtContacts(cat) {
      return BOSTON_CONTACTS[cat].providers
        .map(p => `• ${p.name} — ${p.phone} (${p.note})`)
        .join('\n')
    }

    // Contact / who to call requests
    if (/contact|who.*(call|fix|hire)|phone|number|find.*someone|service|company|contractor|plumber|electrician|exterminator|pest|rat|mice|rodent|bug|cockroach/i.test(lastUserMsg)) {
      if (/rat|mice|mouse|rodent|pest|bug|cockroach|insect|infestation|dead.*animal|animal.*dead/i.test(lastUserMsg)) {
        return res.json({ reply: `**This is a landlord responsibility** under Massachusetts Sanitary Code (105 CMR 410.550) — rodent infestations must be eliminated at the owner's expense. Notify your landlord in writing immediately.\n\nIf they don't respond within 24 hours for active infestation:\n\n**Pest Control / Exterminator:**\n${fmtContacts('pest')}\n\nDocument everything — photo the evidence with timestamps. You can also file a complaint with Boston Inspectional Services at (617) 635-5300.` })
      }
      if (/plumb|pipe|leak|water|drain|toilet|sink|shower/i.test(lastUserMsg)) {
        return res.json({ reply: `Plumbing repairs in a ${year} building are almost always **landlord responsibility** under Massachusetts Sanitary Code. Document the issue with photos and notify in writing.\n\n**Licensed Plumbers:**\n${fmtContacts('plumbing')}\n\nFor emergency leaks, call Boston Standard Company 24/7 at (617) 288-2911 and send the bill to your landlord if they're unresponsive.` })
      }
      if (/electric|wire|outlet|circuit|power|fuse|breaker/i.test(lastUserMsg)) {
        return res.json({ reply: `Electrical issues in a pre-war building should always be treated as potential hazards. This is **landlord responsibility** for anything involving building wiring.\n\n**Licensed Electricians:**\n${fmtContacts('electrical')}\n\nIf you smell burning or see sparking, call 911 first. Then document and notify your landlord in writing.` })
      }
      if (/heat|boiler|hvac|furnace|radiator|steam|hot water/i.test(lastUserMsg)) {
        return res.json({ reply: `Heating failures in Massachusetts are **urgent landlord responsibility** — required to maintain minimum 68°F (day) and 64°F (night) from Sept 15 – June 15.\n\n**HVAC / Boiler Service:**\n${fmtContacts('hvac')}\n\nIf your landlord doesn't respond to a heating failure within 24 hours, call Boston Inspectional Services at (617) 635-5300 immediately.` })
      }
      if (/roof|leak.*ceiling|ceiling.*leak|water.*upstairs/i.test(lastUserMsg)) {
        return res.json({ reply: `Roof and water intrusion is **always landlord responsibility**. Document with timestamped photos from multiple angles.\n\n**Roofing Contractors:**\n${fmtContacts('roofing')}\n\nAlso contact:\n**General Contractors:**\n${fmtContacts('general')}` })
      }
      if (/landlord|tenant|right|evict|deposit|legal|law|complaint/i.test(lastUserMsg)) {
        return res.json({ reply: `Massachusetts has some of the strongest tenant protections in the US. Here's who can help:\n\n**Tenant Rights & Legal Help:**\n${fmtContacts('tenant')}\n\nKey rights: landlord must maintain habitable conditions, 14-day repair notice, security deposit interest, no retaliation for complaints.` })
      }
      // Generic contact request
      return res.json({ reply: `Here are the key Boston service providers for ${address}:\n\n**Pest Control:**\n${fmtContacts('pest')}\n\n**Plumbing:**\n${fmtContacts('plumbing')}\n\n**Electrical:**\n${fmtContacts('electrical')}\n\n**HVAC / Boiler:**\n${fmtContacts('hvac')}\n\n**General Contractor:**\n${fmtContacts('general')}\n\n**Tenant Rights Help:**\n${fmtContacts('tenant')}` })
    }

    // Landlord / responsibility questions
    if (/landlord|responsib|who.*pay|my.*right|fix.*it|they.*fix|should.*fix/i.test(lastUserMsg)) {
      return res.json({ reply: `Under Massachusetts Sanitary Code (105 CMR 410), landlords are responsible for maintaining all structural elements, mechanical systems, heat, hot water, and pest-free conditions. Tenants are responsible for damage they cause and keeping their unit clean.\n\nFor this ${year} building, anything involving the original building systems — plumbing, electrical, heating, roof — is almost certainly landlord responsibility. Always notify in writing (text or email) and keep a record. If they don't respond, file with Boston Inspectional Services: (617) 635-5300.` })
    }

    // Safety / hazard questions
    if (/safe|danger|hazard|lead|asbestos|mold|carbon|smoke|fire/i.test(lastUserMsg)) {
      return res.json({ reply: `In a ${year} Boston triple-decker, the main hazards to be aware of:\n\n**Lead paint** — assumed present in any pre-1978 building. Don't sand, scrape, or disturb painted surfaces. Landlord is legally required to disclose and deleach if children under 6 live there.\n\n**Carbon monoxide** — a steam boiler without CO detectors is a serious risk. Massachusetts requires CO detectors within 10 feet of each sleeping area. Verify yours are working.\n\n**Knob-and-tube wiring** — likely still present in wall cavities. Don't overload circuits. If you smell burning from outlets, call an electrician immediately: APlus Electric (617) 765-7550.` })
    }

    // Fallback — element context with actual question acknowledged
    const elementContext = {
      'Boiler':     `The ${year} steam boiler system distributes heat through cast iron radiators. These systems are durable but require annual maintenance — bleeding radiators, checking water levels, and testing the pressure relief valve. Ask your landlord for the last service date.`,
      'Electrical': `A ${year} building almost certainly has original knob-and-tube wiring in the wall cavities even if the service panel was upgraded. This wiring is ungrounded and can't safely handle modern loads. Don't use high-draw appliances on original outlets.`,
      'Kitchen':    `Pre-war galvanised iron pipes are standard in ${year} construction. After 100+ years they develop interior corrosion — watch for orange tint in cold water first thing in the morning. This is landlord responsibility to address.`,
      'Bathroom':   `The bathroom plumbing chase runs through all three floors in this balloon frame building. The cast iron drain stack is durable but supply lines are likely original galvanised. Document any ceiling stains below — they indicate drain issues.`,
      'Wall':       `Load-bearing balloon frame walls run continuously from basement to roof with no fire blocking. Don't drill or cut without knowing what's behind. Use a stud finder and only anchor into studs.`,
      'Roof':       `Flat roofs on Boston triple-deckers are typically modified bitumen or tar-and-gravel. Watch for ceiling stains on the top floor — water infiltration in balloon frame construction spreads fast.`,
    }
    const key = Object.keys(elementContext).find(k => element.name.toLowerCase().includes(k.toLowerCase())) || 'Bathroom'
    return res.json({ reply: `${elementContext[key]}\n\nIs there something specific you'd like to know about this? I can also give you contacts for repair services.` })
  }

  try {
    const reply = await geminiChat(buildChatSystemPrompt(propertyData, element, documents), messages)
    res.json({ reply, source: 'gemini' })
  } catch (err) {
    console.error('[chat] Gemini error:', err.message)
    res.status(500).json({ error: 'AI unavailable' })
  }
})

// POST /api/cani
// Body: { question, propertyData }
// Returns: { answer, safe }
app.post('/api/cani', async (req, res) => {
  const { question, propertyData } = req.body
  if (!question) return res.status(400).json({ error: 'question required' })

  const DEMO_ANSWERS = {
    'drill':      { answer: 'Check first. In a pre-war triple-decker, wall cavities run unblocked from basement to roof — wiring, pipes, and gas lines all share that space. Use a stud finder before drilling anywhere. Into studs: safe. Between studs in an exterior wall: always check for knob-and-tube wiring first with a non-contact voltage tester ($15 at any hardware store).', safe: 'CAUTION' },
    'showerhead': { answer: 'Yes — with one caveat. Turn off the water supply valve first. Galvanised pipe this age can have slightly weakened threads, so hand-tighten then one quarter-turn with pliers only. Do not overtighten. If the fitting looks corroded or the pipe moves when you apply pressure, stop and notify your landlord.', safe: 'YES' },
    'shelves':    { answer: 'Yes, into studs only. Plaster-over-lath walls in a pre-war building are harder to find studs in than drywall — a magnetic stud finder works better here (finds the nails in the lath). Keep shelf loads under 30lbs per stud anchor. Avoid the party wall (shared with next unit) entirely.', safe: 'YES' },
    'wear':       { answer: 'Massachusetts law is specific: normal wear and tear is the landlord\'s responsibility, never the tenant\'s. This includes: paint fading or minor scuffs, carpet wear from normal use, minor wall marks, loose door handles, dripping faucets. Document the current condition with timestamped photos.', safe: 'INFO' },
    'command':    { answer: 'Yes — Command strips work on plaster walls but with limits. Max weight per strip is lower on plaster than drywall (about 60% of the stated max). The critical rule: when removing them, pull the tab STRAIGHT DOWN parallel to the wall, very slowly. Pre-1940 plaster is more brittle than modern surfaces.', safe: 'YES' },
    'paint':      { answer: 'Check your lease first — most Boston leases require landlord permission for paint. If approved: use a primer designed for lead paint encapsulation (do not sand existing paint). Return walls to original colour before move-out.', safe: 'CAUTION' },
  }
  function getDemoAnswer(q) {
    const ql = q.toLowerCase()
    if (ql.includes('drill') || ql.includes('hole')) return DEMO_ANSWERS.drill
    if (ql.includes('shower') || ql.includes('faucet') || ql.includes('tap')) return DEMO_ANSWERS.showerhead
    if (ql.includes('shelf') || ql.includes('shelv') || ql.includes('hang') || ql.includes('mount')) return DEMO_ANSWERS.shelves
    if (ql.includes('wear') || ql.includes('damage') || ql.includes('deposit')) return DEMO_ANSWERS.wear
    if (ql.includes('command') || ql.includes('strip') || ql.includes('adhesive')) return DEMO_ANSWERS.command
    if (ql.includes('paint') || ql.includes('colour') || ql.includes('color')) return DEMO_ANSWERS.paint
    return { answer: 'In a pre-war Boston triple-decker, anything involving the building structure or original systems requires landlord notification first. Document what you\'re doing with before-and-after photos.', safe: 'CAUTION' }
  }

  if (!HAS_API_KEY) return res.json(getDemoAnswer(question))

  try {
    const a = propertyData?.assessor || {}
    const prompt = `You are Mainten AI answering a renter's "Can I?" question about their home.

Property: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
Type: ${a.luDesc || 'Residential'} · Heat: ${a.heatType || 'Unknown'}

Question: "${question}"

Answer with a JSON object ONLY, no markdown:
{
  "answer": "Direct practical answer in 3-5 sentences. Specific to this property's age and construction. Include any safety precautions or steps needed.",
  "safe": "YES | NO | CAUTION | INFO"
}

YES = they can do it freely. CAUTION = they can but with specific care. NO = they should not / need landlord permission. INFO = informational, no clear yes/no.`
    const text = await geminiGenerate(prompt)
    res.json(JSON.parse(stripJson(text)))
  } catch (err) {
    console.error('[cani] Gemini error — using demo:', err.message)
    res.json(getDemoAnswer(question))
  }
})

// POST /api/diagnose
// Body: { issue, propertyData, element }
// Returns: { diagnosis }
app.post('/api/diagnose', async (req, res) => {
  const { issue, propertyData, element } = req.body
  if (!issue || !element) return res.status(400).json({ error: 'issue and element required' })

  if (!HAS_API_KEY) {
    return res.json({
      diagnosis: {
        diagnosis: `Based on the property construction era (1914 triple-decker) and the reported issue with the ${element.name}, this is consistent with age-related deterioration common in pre-war Boston residential buildings. The materials used in 1914 are at or beyond their expected service life.`,
        responsibility: 'LANDLORD',
        responsibilityReason: 'Under Massachusetts Sanitary Code Chapter II (105 CMR 410), landlords are responsible for maintaining all structural elements and mechanical systems in safe and working condition.',
        urgency: 'SOON',
        urgencyReason: 'Not immediately dangerous but should be addressed within 30 days to prevent worsening.',
        jobBrief: `Service required at ${propertyData?.address || 'the property'} — a 1914 Boston triple-decker. Issue: ${issue} with the ${element.name}. Property has original construction materials typical of pre-war balloon frame buildings. Access via front entrance, unit on [floor]. Contractor should note: building uses original galvanised plumbing and knob-and-tube electrical — exercise caution with any penetrations. Provide written scope and cost estimate before work begins.`,
        diyPossible: false,
        diyNote: 'Professional assessment recommended given the age of materials and potential interaction with original building systems.',
      },
      source: 'demo',
    })
  }

  try {
    const text = await geminiGenerate(buildDiagnosisPrompt(propertyData, element, issue))
    const diagnosis = JSON.parse(stripJson(text))
    res.json({ diagnosis, source: 'gemini' })
  } catch (err) {
    console.error('[diagnose] Gemini error:', err.message)
    res.status(500).json({ error: 'AI unavailable' })
  }
})

// ──────────────────────────────────────────────────────────────
//  DEMO FLOOR PLAN GENERATOR
// ──────────────────────────────────────────────────────────────
function generateDemoFloorPlan(roomDetails) {
  const beds = parseInt(roomDetails.bedrooms) || 2
  const baths = parseInt(roomDetails.bathrooms) || 1
  const kitchens = parseInt(roomDetails.kitchen) || 1
  const living = parseInt(roomDetails.living) || 1
  const others = roomDetails.others || []

  const rooms = []
  let id = 0

  // Layout: living + kitchen top row, bedrooms + baths bottom row, hallway connecting
  const totalW = 12, totalH = 10

  // Hallway strip
  rooms.push({ id: `r${id++}`, name: 'Hallway', type: 'hallway', x: 0, y: 4, w: totalW, h: 1, doors: [] })

  // Living room(s) - top left
  let lx = 0
  for (let i = 0; i < living; i++) {
    rooms.push({ id: `r${id++}`, name: living > 1 ? `Living ${i+1}` : 'Living Room', type: 'living', x: lx, y: 0, w: 5, h: 4, doors: [{ wall: 'south', pos: 0.5 }] })
    lx += 5
  }

  // Kitchen(s)
  let kx = lx
  for (let i = 0; i < kitchens; i++) {
    rooms.push({ id: `r${id++}`, name: kitchens > 1 ? `Kitchen ${i+1}` : 'Kitchen', type: 'kitchen', x: kx, y: 0, w: 4, h: 4, doors: [{ wall: 'south', pos: 0.5 }] })
    kx += 4
  }

  // Others top right
  let ox = kx
  for (const name of others.slice(0, 1)) {
    const w = Math.min(3, totalW - ox)
    if (w > 0) rooms.push({ id: `r${id++}`, name, type: 'other', x: ox, y: 0, w, h: 4, doors: [{ wall: 'south', pos: 0.5 }] })
    ox += w
  }

  // Bedrooms bottom
  const bedroomW = Math.floor((totalW - baths * 2) / Math.max(beds, 1))
  let bx = 0
  for (let i = 0; i < beds; i++) {
    const w = i === beds - 1 ? totalW - baths * 2 - bx : bedroomW
    rooms.push({ id: `r${id++}`, name: beds > 1 ? `Bedroom ${i+1}` : 'Bedroom', type: 'bedroom', x: bx, y: 5, w: Math.max(w, 3), h: 5, doors: [{ wall: 'north', pos: 0.5 }] })
    bx += Math.max(w, 3)
  }

  // Bathrooms bottom right
  for (let i = 0; i < baths; i++) {
    rooms.push({ id: `r${id++}`, name: baths > 1 ? `Bath ${i+1}` : 'Bathroom', type: 'bathroom', x: totalW - (baths - i) * 2, y: 5, w: 2, h: 5, doors: [{ wall: 'north', pos: 0.5 }] })
  }

  return { rooms, totalW, totalH }
}

// ──────────────────────────────────────────────────────────────
//  FLOOR PLAN — VIDEO ANALYSIS
// ──────────────────────────────────────────────────────────────
app.post('/api/floorplan', async (req, res) => {
  const { frames, roomDetails } = req.body
  if (!frames?.length) return res.status(400).json({ error: 'frames required' })

  if (!HAS_API_KEY) {
    return res.json({ floorPlan: generateDemoFloorPlan(roomDetails), source: 'demo' })
  }

  const prompt = `You are analyzing 3 frames from a home interior video. Generate a 2D floor plan of ONLY the rooms clearly visible.

STRICT RULES:
- Map ONLY rooms you can actually see. If 1 room is visible, return 1 room only.
- Observe doors: which wall, position along wall (0=left, 1=right), hinge side.
- Observe windows: which wall, position, width as fraction of wall.
- Room proportions must reflect actual shape — long narrow room has w >> h.
- User context hints: ${roomDetails.bedrooms || 0} bedroom(s), ${roomDetails.bathrooms || 0} bathroom(s), ${roomDetails.kitchen || 0} kitchen(s), ${roomDetails.living || 0} living room(s)

Return ONLY valid JSON, no markdown:
{"rooms":[{"id":"r1","name":"Bedroom","type":"bedroom","x":0,"y":0,"w":6,"h":5,"doors":[{"wall":"south","pos":0.3,"hinge":"left"}],"windows":[{"wall":"north","pos":0.5,"size":0.3}]}],"totalW":6,"totalH":5}

wall: "north"|"south"|"east"|"west" — pos: 0.0–1.0 along wall — hinge: "left"|"right" from inside — size: window width fraction
type: bedroom|bathroom|kitchen|living|dining|hallway|other`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const parts = [
      { text: prompt },
      ...frames.map(f => ({ inlineData: { mimeType: 'image/png', data: f } })),
    ]
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] })
    const text = result.response.text().trim()
    console.log('[floorplan] Gemini response:', text.slice(0, 300))
    const floorPlan = JSON.parse(stripJson(text))
    res.json({ floorPlan, source: 'gemini' })
  } catch (err) {
    console.error('[floorplan] error:', err.message)
    res.json({ floorPlan: generateDemoFloorPlan(roomDetails), source: 'fallback' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Mainten API running on http://localhost:${PORT}`))
