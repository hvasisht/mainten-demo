// Shared helpers for Vercel serverless API functions — powered by Google Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai')

const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const HAS_API_KEY = GEMINI_KEY.length > 10 && !GEMINI_KEY.startsWith('your_')

const genAI = HAS_API_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null

// ──────────────────────────────────────────────────────────────
//  GEMINI HELPERS
// ──────────────────────────────────────────────────────────────

// Single-shot text generation (insights, diagnose, cani)
async function geminiGenerate(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

// Multi-turn chat with system instruction (chat panel)
async function geminiChat(systemInstruction, messages) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
  })
  // All messages except the last go into history
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const lastMsg = messages[messages.length - 1]
  const chat = model.startChat({ history })
  const result = await chat.sendMessage(lastMsg.content)
  return result.response.text().trim()
}

function stripJson(text) {
  return text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
}

// ──────────────────────────────────────────────────────────────
//  BOSTON SERVICE CONTACTS
// ──────────────────────────────────────────────────────────────
const BOSTON_CONTACTS = {
  pest: {
    label: 'Pest Control / Exterminator',
    providers: [
      { name: 'JP Pest Services',      phone: '1-800-222-2908', note: 'Same-day available, Boston metro' },
      { name: "Slade's Pest Control",  phone: '(617) 327-0500', note: 'South Boston based, family-run' },
      { name: 'Catseye Pest Control',  phone: '(617) 340-1001', note: 'Rodent exclusion specialists' },
    ],
  },
  plumbing: {
    label: 'Licensed Plumber',
    providers: [
      { name: 'Boston Standard Company', phone: '(617) 288-2911', note: '24/7 emergency, licensed & insured' },
      { name: 'G&C Plumbing & Heating', phone: '(617) 323-2422', note: 'Family-owned since 1958' },
      { name: 'Rooter-Man Boston',       phone: '(617) 396-1550', note: 'Drain, sewer, pipe repairs' },
    ],
  },
  electrical: {
    label: 'Licensed Electrician',
    providers: [
      { name: 'APlus Electric',              phone: '(617) 765-7550', note: 'Licensed, Boston metro' },
      { name: 'Century Electrical Services', phone: '(617) 782-0993', note: 'Knob-and-tube remediation' },
    ],
  },
  hvac: {
    label: 'HVAC / Boiler Service',
    providers: [
      { name: 'Boston Standard Company', phone: '(617) 288-2911', note: 'Boiler service + steam, 24/7' },
      { name: 'New England Mechanical',  phone: '(781) 935-1488', note: 'Residential & commercial HVAC' },
    ],
  },
  roofing: {
    label: 'Roofing Contractor',
    providers: [
      { name: 'Unified Roofing',       phone: '(617) 848-4755', note: 'Flat roof specialists' },
      { name: 'Mass Roofing & Siding', phone: '(617) 698-2415', note: 'Licensed, free inspections' },
    ],
  },
  general: {
    label: 'General Contractor',
    providers: [
      { name: 'BuildZoom Boston', phone: 'buildzoom.com', note: 'Vetted contractors with license checks' },
      { name: 'Angi',             phone: 'angi.com',      note: 'Get 3 competing quotes' },
    ],
  },
  tenant: {
    label: 'Tenant Rights / Legal Help',
    providers: [
      { name: 'Greater Boston Legal Services', phone: '(617) 603-1700', note: 'Free legal help for tenants' },
      { name: 'Boston Tenant Coalition',       phone: '(617) 522-2800', note: 'Tenant advocacy & resources' },
      { name: 'MA AG Housing Hotline',         phone: '(617) 963-2197', note: 'File housing complaints' },
    ],
  },
}

function fmtContacts(catKey) {
  const cat = BOSTON_CONTACTS[catKey]
  if (!cat) return ''
  return cat.providers.map(p => `• ${p.name} — ${p.phone} (${p.note})`).join('\n')
}

// ──────────────────────────────────────────────────────────────
//  DEMO CHAT — smart fallback when no API key
// ──────────────────────────────────────────────────────────────
function getDemoChatReply(messages, element) {
  const lastUserMsg = Array.isArray(messages)
    ? ([...messages].reverse().find(m => m.role === 'user')?.content || '')
    : (messages || '')
  const q = lastUserMsg.toLowerCase()
  const elementName = (typeof element === 'object' ? element?.name : element) || ''

  if (/rat|mice|mouse|rodent|pest|bug|cockroach|insect|infestation|dead.*animal|vermin/i.test(q)) {
    return `**Landlord's responsibility** under MA Sanitary Code (105 CMR 410.550) — rodent infestations must be eliminated at the owner's expense.\n\nNotify your landlord **in writing** immediately. If no response within 24 hours:\n\n**Pest Control / Exterminator:**\n${fmtContacts('pest')}\n\nDocument everything with timestamped photos.\n📞 Boston Inspectional Services: **(617) 635-5300**`
  }
  if (/contact|who.*(call|fix|hire)|phone|number|contractor/i.test(q)) {
    if (/plumb|pipe|leak|water|drain|toilet|sink|shower/i.test(q + elementName)) {
      return `Plumbing repairs in a pre-war building are **landlord responsibility**.\n\n**Licensed Plumbers:**\n${fmtContacts('plumbing')}\n\nFor active leaks call 24/7: **(617) 288-2911**`
    }
    if (/electric|wire|outlet|circuit|power/i.test(q + elementName)) {
      return `Electrical work is **landlord responsibility**. Never touch exposed wiring.\n\n**Licensed Electricians:**\n${fmtContacts('electrical')}`
    }
    if (/heat|boiler|hvac|radiator|steam/i.test(q + elementName)) {
      return `Heating failures are **urgent landlord responsibility** (min 68°F required by MA law).\n\n**HVAC / Boiler:**\n${fmtContacts('hvac')}\n\nNo response? Boston Inspectional: **(617) 635-5300**`
    }
    return `**Boston Service Providers:**\n\n**Pest Control:**\n${fmtContacts('pest')}\n\n**Plumbing:**\n${fmtContacts('plumbing')}\n\n**Electrical:**\n${fmtContacts('electrical')}\n\n**HVAC:**\n${fmtContacts('hvac')}\n\n**Tenant Rights:**\n${fmtContacts('tenant')}`
  }
  if (/landlord|responsible|who.*pay|should.*fix/i.test(q)) {
    return `Under **Massachusetts Sanitary Code (105 CMR 410)**, landlords must maintain:\n• All structural elements and mechanical systems\n• Heat (min 68°F day / 64°F night, Sept–June)\n• Hot water, plumbing, electrical\n• Pest-free conditions\n\nAlways notify in writing and keep records.\n📞 Boston Inspectional Services: **(617) 635-5300**`
  }
  if (/safe|danger|lead|asbestos|mold|carbon/i.test(q)) {
    return `Key hazards in a pre-1940 triple-decker:\n\n**Lead paint** — assumed present on all original surfaces. Never sand or scrape. Landlord must deleach if children under 6 live here.\n\n**Carbon monoxide** — CO detectors required within 10ft of each sleeping area.\n\n**Knob-and-tube wiring** — likely in wall cavities. Don't overload circuits.\n\n**Electrical:** Century Electrical **(617) 782-0993**`
  }

  const ELEMENT_DEFAULTS = {
    'Boiler':     `The steam boiler in this building distributes heat through cast iron radiators. Annual maintenance required: water level check, pressure relief valve test, radiator bleeding.\n\n**Boiler Service:** Boston Standard **(617) 288-2911** (24/7)\n\nAsk me anything — repairs, costs, rights, contacts.`,
    'Electrical': `Pre-war buildings have original **knob-and-tube wiring** in wall cavities — ungrounded and unable to handle modern loads. Even if the panel was upgraded, in-wall wiring is likely original.\n\n**Inspection:** Century Electrical **(617) 782-0993**`,
    'Kitchen':    `Pre-war galvanised iron pipes corrode from inside — orange-tinted cold water in the morning confirms it. **Landlord responsibility** to address.\n\n**Plumbers:**\n${fmtContacts('plumbing')}\n\nAsk me anything — pest issues, appliances, rights.`,
    'Bathroom':   `The plumbing chase runs through all three floors. Cast iron drain stack is durable but supply lines are likely galvanised. Document ceiling stains below.\n\n**Plumbing:** G&C **(617) 323-2422**\n\nWhat's your question?`,
    'Bedroom':    `**Lead paint assumed present** on all original surfaces. Never sand or scrape. CO and smoke detectors required by MA law.\n\n**Tenant Rights:** Boston Tenant Coalition **(617) 522-2800**`,
    'Living':     `Load-bearing balloon frame walls run from basement to roof with no fire blocking. Use a stud finder before drilling. Lead paint assumed present.\n\n**Structural concerns:** BuildZoom **buildzoom.com**`,
    'Roof':       `Flat roofs on triple-deckers are typically modified bitumen. Watch for top-floor ceiling stains — water infiltration spreads fast in balloon frame construction.\n\n**Roofing:** Unified Roofing **(617) 848-4755**`,
  }

  const key = Object.keys(ELEMENT_DEFAULTS).find(k => elementName.toLowerCase().includes(k.toLowerCase()))
  return ELEMENT_DEFAULTS[key] || `Ask me anything about this property — repairs, rights, safety, or who to call.\n\n**Quick contacts:**\n• Pest/rodent: JP Pest **(1-800-222-2908)**\n• Plumbing emergency: Boston Standard **(617) 288-2911**\n• Tenant rights: GBLS **(617) 603-1700**`
}

// ──────────────────────────────────────────────────────────────
//  DEMO FALLBACK INSIGHTS
// ──────────────────────────────────────────────────────────────
const DEMO_INSIGHTS = [
  { category: 'Electrical', status: 'RISK',    headline: 'Knob-and-tube wiring probable in walls',      detail: 'Built before 1940 — original wiring predates modern standards. Service panel may have been upgraded but wall wiring almost certainly unchanged. Not covered by modern homeowner\'s insurance.',                                                                                   icon: '⚡' },
  { category: 'Plumbing',   status: 'INFERRED', headline: 'Galvanised iron pipes likely throughout',     detail: 'No recent plumbing permit found. After 100+ years, galvanised iron pipes corrode from inside, reducing pressure and discolouring water. Replacement cost averages $8,000–$15,000.',                                                                                              icon: '🔧' },
  { category: 'Lead Paint', status: 'PROBABLE', headline: 'Lead paint assumed present',                  detail: 'Built before 1978 — Massachusetts law requires disclosure and deleading for units with children under 6. Assume lead paint on all original painted surfaces until tested.',                                                                                                     icon: '⚠'  },
  { category: 'Structure',  status: 'CONFIRMED', headline: 'Balloon frame — fire spreads between floors', detail: 'Pre-1940 triple-decker uses balloon framing with continuous wall cavities from basement to roof. Fire travels between floors in under 90 seconds. Verify smoke detectors on every level.',                                                                                     icon: '🔥' },
  { category: 'Roof',       status: 'MONITOR',  headline: 'Roof age approaching replacement window',     detail: 'Asphalt shingle roofs on Boston triple-deckers typically last 20–25 years. Check for curling shingles, granule loss in gutters, or soft spots — signs replacement may be needed.',                                                                                           icon: '🏠' },
]

// ──────────────────────────────────────────────────────────────
//  GEMINI PROMPTS
// ──────────────────────────────────────────────────────────────
function buildInsightPrompt(propertyData) {
  const a = propertyData.assessor || {}
  const p = propertyData.permits || {}
  const yearBuilt = a.yearBuilt || 'unknown'
  const age = yearBuilt !== 'unknown' ? (new Date().getFullYear() - parseInt(yearBuilt)) : null
  const permitList = (p.records || []).slice(0, 10)
    .map(r => `${r.issuedDate?.slice(0, 4) || '?'}: ${r.type} — ${r.description || 'No description'}`)
    .join('\n')

  return `You are Mainten, an AI property intelligence system powered by Google Gemini. Analyse this Boston property and generate exactly 5 insights a renter needs to know about the real condition of their home.

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

PERMIT HISTORY (${p.total || 0} total permits on record):
${permitList || 'No permits found'}
Permit flags: Boiler: ${p.summary?.hasBoiler ? 'YES' : 'No'} | Electrical: ${p.summary?.hasElectric ? 'YES' : 'No'} | Plumbing: ${p.summary?.hasPlumbing ? 'YES' : 'No'} | Roof: ${p.summary?.hasRoof ? 'YES' : 'No'}

Generate exactly 5 insights. Cover: construction era risks (wiring, pipes, lead paint), structural type, and at least one positive or monitored item if warranted.

Respond with ONLY a valid JSON array — no markdown fences, no preamble, just the array:
[{"category":"Electrical","status":"RISK","headline":"Short headline max 8 words","detail":"2-3 sentences specific to this property year built and permit history. Never generic. Always actionable.","icon":"⚡"}]

Status values: RISK | INFERRED | PROBABLE | CONFIRMED | MONITOR | CLEAR
Icons: ⚡ electrical, 🔧 plumbing, ⚠ hazards, 🔥 structural/fire, 🏠 roof/exterior, 🌡 heating, ✓ clear`
}

function buildChatSystem(propertyData, element) {
  const a = propertyData?.assessor || {}
  const contactsList = Object.values(BOSTON_CONTACTS).map(cat =>
    `${cat.label}:\n` + cat.providers.map(p => `  • ${p.name} — ${p.phone} (${p.note})`).join('\n')
  ).join('\n\n')

  return `You are Mainten AI — a Google Gemini-powered property advisor for Boston renters. Answer ANY question about this property, home maintenance, tenant rights, pest issues, or finding contractors.

PROPERTY:
- Address: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
- Type: ${a.luDesc || 'Residential'} · ${propertyData?.units?.count || '?'} units
- Heat: ${a.heatType || 'Unknown'} / ${a.heatSystem || 'Unknown'}
- Currently discussing: ${element?.name || 'General'}

BOSTON SERVICE CONTACTS — use these when asked for contractors or who to call:
${contactsList}

RULES:
- Answer the user's ACTUAL question — never default to generic element descriptions
- Pest/rat/rodent → landlord responsibility under MA Sanitary Code 410.550 + give pest control contacts
- Any "who to call" or repair question → provide name + phone number from the contacts above
- State landlord vs tenant responsibility before giving contacts
- Reference specific property age and construction era
- Format with **bold** for key points and bullet lists
- Under 200 words, no filler phrases`
}

function buildCanIPrompt(question, propertyData) {
  const a = propertyData?.assessor || {}
  return `You are Mainten AI (powered by Google Gemini) answering a renter's "Can I?" question about their home.

Property: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
Type: ${a.luDesc || 'Residential'} · Heat: ${a.heatType || 'Unknown'}

Question: "${question}"

Respond with ONLY a JSON object — no markdown fences:
{"answer":"Direct practical answer in 3-5 sentences. Specific to this property age and construction. Include any safety precautions.","safe":"YES"}

Values for safe: YES | NO | CAUTION | INFO
YES = they can do it freely. CAUTION = they can but with specific care. NO = they should not / need landlord permission. INFO = informational.`
}

function buildDiagnosisPrompt(propertyData, element, issue) {
  const a = propertyData?.assessor || {}
  return `You are Mainten AI (powered by Google Gemini) diagnosing a property issue.

Property: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
Type: ${a.luDesc || 'Residential'} · ${propertyData?.units?.count || '?'} units
Element: ${element.name}
Issue: "${issue}"

Respond with ONLY a JSON object — no markdown fences:
{"diagnosis":"2-3 sentence diagnosis specific to this property type and age","responsibility":"LANDLORD","responsibilityReason":"One sentence, Massachusetts Sanitary Code reference","urgency":"URGENT","urgencyReason":"One sentence","jobBrief":"Professional job description for a tradesperson. 3-4 sentences including property type, construction era, problem, access notes.","diyPossible":false,"diyNote":"Why professional needed or brief safe DIY if possible."}
responsibility: LANDLORD | TENANT | SHARED
urgency: URGENT | SOON | MONITOR`
}

const DEMO_DIAGNOSIS = (elementName, issue, address) => ({
  diagnosis: `Based on the property's construction era and the reported issue with the ${elementName}, this is consistent with age-related deterioration common in pre-war Boston residential buildings. The materials used in early 1900s construction are at or beyond their expected service life.`,
  responsibility: 'LANDLORD',
  responsibilityReason: 'Under Massachusetts Sanitary Code Chapter II (105 CMR 410), landlords are responsible for maintaining all structural elements and mechanical systems in safe and working condition.',
  urgency: 'SOON',
  urgencyReason: 'Not immediately dangerous but should be addressed within 30 days to prevent worsening.',
  jobBrief: `Service required at ${address || 'the property'} — a pre-war Boston triple-decker. Issue: ${issue} affecting the ${elementName}. Property has original construction materials typical of pre-war balloon frame buildings. Contractor should note: building likely has original galvanised plumbing and knob-and-tube electrical. Please provide written scope and cost estimate before work begins.`,
  diyPossible: false,
  diyNote: 'Professional assessment recommended given the age of materials and potential interaction with original building systems.',
})

module.exports = {
  HAS_API_KEY,
  geminiGenerate,
  geminiChat,
  stripJson,
  DEMO_INSIGHTS,
  getDemoChatReply,
  buildInsightPrompt,
  buildChatSystem,
  buildCanIPrompt,
  buildDiagnosisPrompt,
  DEMO_DIAGNOSIS,
  BOSTON_CONTACTS,
}
