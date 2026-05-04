// Shared helpers for Vercel serverless API functions
const Anthropic = require('@anthropic-ai/sdk')

const RAW_KEY = process.env.ANTHROPIC_API_KEY || ''
const HAS_API_KEY = RAW_KEY.length > 10 && !RAW_KEY.startsWith('your_')
const anthropic = new Anthropic({ apiKey: RAW_KEY })

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
      { name: 'Unified Roofing',       phone: '(617) 848-4755', note: 'Flat roof specialists, triple-deckers' },
      { name: 'Mass Roofing & Siding', phone: '(617) 698-2415', note: 'Licensed, free inspections' },
    ],
  },
  general: {
    label: 'General Contractor',
    providers: [
      { name: 'BuildZoom Boston', phone: 'buildzoom.com', note: 'Vetted contractors with license checks' },
      { name: 'Angi',             phone: 'angi.com',      note: 'Get 3 competing quotes from local pros' },
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
//  SMART DEMO CHAT — reads the actual question
// ──────────────────────────────────────────────────────────────
function getDemoChatReply(messages, element) {
  // Accept either an array of messages or a plain string (legacy)
  const lastUserMsg = Array.isArray(messages)
    ? ([...messages].reverse().find(m => m.role === 'user')?.content || '')
    : (messages || '')
  const q = lastUserMsg.toLowerCase()
  const elementName = (typeof element === 'object' ? element?.name : element) || ''
  const year = '1914'

  // ── Pest / rodent issues ──
  if (/rat|mice|mouse|rodent|pest|bug|cockroach|insect|infestation|dead.*animal|vermin/i.test(q)) {
    return `**Landlord's responsibility** under MA Sanitary Code (105 CMR 410.550) — rodent infestations must be eliminated at the owner's expense.\n\nNotify your landlord **in writing** (text or email) immediately. If no response within 24 hours:\n\n**Pest Control / Exterminator:**\n${fmtContacts('pest')}\n\nDocument everything with timestamped photos.\n📞 Boston Inspectional Services: **(617) 635-5300** — file a complaint if landlord is unresponsive.`
  }

  // ── Contact / who to call ──
  if (/contact|who.*(call|fix|hire|should i)|phone|number|find.*someone|get.*someone|contractor/i.test(q)) {
    if (/plumb|pipe|leak|water|drain|toilet|sink|shower/i.test(q + elementName)) {
      return `Plumbing repairs in a ${year} building are **landlord responsibility** under MA Sanitary Code.\n\n**Licensed Plumbers:**\n${fmtContacts('plumbing')}\n\nFor active leaks call Boston Standard 24/7: **(617) 288-2911**. Document with photos first.`
    }
    if (/electric|wire|outlet|circuit|power|fuse|breaker/i.test(q + elementName)) {
      return `Electrical work in pre-war buildings is **landlord responsibility**. Never touch exposed wiring yourself.\n\n**Licensed Electricians:**\n${fmtContacts('electrical')}\n\nFor sparking or burning smell — call **911 first**, then document.`
    }
    if (/heat|boiler|hvac|furnace|radiator|steam/i.test(q + elementName)) {
      return `Heating failures are **urgent landlord responsibility** — MA law requires minimum 68°F daytime from Sept–June.\n\n**HVAC / Boiler Service:**\n${fmtContacts('hvac')}\n\nNo response in 24h? Call Boston Inspectional Services: **(617) 635-5300**`
    }
    if (/roof|ceiling.*leak/i.test(q + elementName)) {
      return `Roof and water intrusion is **always landlord responsibility**.\n\n**Roofing Contractors:**\n${fmtContacts('roofing')}\n\n**General Contractors:**\n${fmtContacts('general')}`
    }
    if (/landlord|tenant|right|legal|law|evict|deposit/i.test(q)) {
      return `**Tenant Rights & Legal Help:**\n${fmtContacts('tenant')}\n\nKey MA rights: landlord must maintain habitable conditions, 14-day repair notice, security deposit interest due, no retaliation for complaints.`
    }
    // Generic contact request
    return `**Boston Service Providers:**\n\n**Pest Control:**\n${fmtContacts('pest')}\n\n**Plumbing:**\n${fmtContacts('plumbing')}\n\n**Electrical:**\n${fmtContacts('electrical')}\n\n**HVAC / Boiler:**\n${fmtContacts('hvac')}\n\n**Tenant Rights:**\n${fmtContacts('tenant')}`
  }

  // ── Landlord vs tenant responsibility ──
  if (/landlord|responsible|who.*pay|my.*right|should.*fix|whose.*job/i.test(q)) {
    return `Under **Massachusetts Sanitary Code (105 CMR 410)**, landlords must maintain:\n• All structural elements and mechanical systems\n• Heat (min 68°F day / 64°F night, Sept–June)\n• Hot water, functioning plumbing and electrical\n• Pest-free conditions\n\nTenants are responsible for damage they cause and keeping the unit reasonably clean.\n\nFor this ${year} building — anything involving original systems is almost certainly landlord territory.\n\n📞 Boston Inspectional Services: **(617) 635-5300**`
  }

  // ── Safety / hazards ──
  if (/safe|danger|hazard|lead|asbestos|mold|mould|carbon|smoke|fire/i.test(q)) {
    return `Key hazards in a **${year} Boston triple-decker**:\n\n**Lead paint** — assumed present on all original surfaces (pre-1978). Never sand or scrape painted walls. Landlord must deleach if children under 6 live here.\n\n**Carbon monoxide** — CO detectors required within 10 feet of each sleeping area. Verify yours.\n\n**Knob-and-tube wiring** — likely in wall cavities. Don't overload circuits. If you smell burning from an outlet: call **(617) 765-7550**`
  }

  // ── Water / moisture issues ──
  if (/water|leak|damp|wet|stain|mold|mould|flood/i.test(q)) {
    return `Water issues in a balloon frame building spread fast — the wall cavities run continuously from basement to roof.\n\n**Immediate steps:**\n• Document with timestamped photos\n• Notify landlord in writing\n• If ceiling is bulging, evacuate that area\n\n**Plumbers (for pipe leaks):**\n${fmtContacts('plumbing')}\n\n**Roofing (for ceiling stains):**\n${fmtContacts('roofing')}\n\nThis is **landlord responsibility** under MA Sanitary Code.`
  }

  // ── Default: element-contextual response with contacts ──
  const ELEMENT_DEFAULTS = {
    'Boiler':     `The steam boiler in this ${year} building distributes heat through cast iron radiators on all three floors. Annual maintenance required: water level check, pressure relief valve test, radiator bleeding. The hissing/knocking you hear is air escaping — normal.\n\n**Boiler Service:** Boston Standard Company **(617) 288-2911** (24/7)\n\nAsk anything — I can also tell you about repair rights, costs, or what questions to ask your landlord.`,
    'Electrical': `Pre-war buildings almost certainly have original **knob-and-tube wiring** in wall cavities — ungrounded and unable to handle modern loads. Even if the panel was upgraded, in-wall wiring is likely original. Don't use high-draw appliances on original outlets.\n\n**For inspection:** Century Electrical **(617) 782-0993**\n\nWhat do you want to know?`,
    'Kitchen':    `Pre-war galvanised iron pipes corrode from inside — watch for orange-tinted cold water in the morning. This is **landlord responsibility** to address.\n\n**Licensed Plumbers:**\n${fmtContacts('plumbing')}\n\nAsk me anything — pest issues, appliance questions, what counts as normal wear and tear.`,
    'Bathroom':   `The bathroom plumbing chase runs through all three floors. Cast iron drain stack is durable but supply lines are likely galvanised. Document any ceiling stains below — they indicate drain issues.\n\n**Plumbing:** G&C Plumbing **(617) 323-2422**\n\nWhat's your question?`,
    'Bedroom':    `Bedrooms in ${year} triple-deckers have plaster-over-lath walls with continuous cavities — no fire blocking. **Lead paint is assumed present** on all original surfaces. CO and smoke detectors are required by MA law.\n\n**Tenant Rights:** Boston Tenant Coalition **(617) 522-2800**\n\nWhat do you want to know?`,
    'Living':     `Load-bearing balloon frame walls in this ${year} building run from basement to roof with no fire blocking. Use a stud finder before drilling. Lead paint assumed present.\n\n**Structural concerns:** BuildZoom Boston — **buildzoom.com**\n\nAsk me anything about this room.`,
    'Roof':       `Flat roofs on Boston triple-deckers are typically modified bitumen. Watch for ceiling stains on the top floor — water infiltration in balloon frame construction spreads fast.\n\n**Roofing:** Unified Roofing **(617) 848-4755**\n\nWhat do you want to know?`,
  }

  const key = Object.keys(ELEMENT_DEFAULTS).find(k => elementName.toLowerCase().includes(k.toLowerCase()))
  const defaultReply = ELEMENT_DEFAULTS[key] || `I can answer any question about this property — repairs, rights, who to call, what's safe to do yourself, and more. What do you want to know?\n\n**Quick contacts:**\n• Pest/rodent issues: JP Pest **(1-800-222-2908)**\n• Plumbing emergencies: Boston Standard **(617) 288-2911)**\n• Tenant rights: GBLS **(617) 603-1700**`
  return defaultReply
}

// ──────────────────────────────────────────────────────────────
//  DEMO FALLBACK INSIGHTS
// ──────────────────────────────────────────────────────────────
const DEMO_INSIGHTS = [
  {
    category: 'Electrical',
    status: 'RISK',
    headline: 'Knob-and-tube wiring probable in walls',
    detail: 'Built before 1940 — electrical wiring predates modern standards. Any permit likely upgraded the service panel only. Original knob-and-tube wiring in wall cavities is typical and not covered by modern homeowner\'s insurance.',
    icon: '⚡',
  },
  {
    category: 'Plumbing',
    status: 'INFERRED',
    headline: 'Galvanised iron pipes likely throughout',
    detail: 'No recent plumbing permit found. After 100+ years, galvanised iron pipes develop interior corrosion that reduces water pressure, discolours water, and eventually leads to pinhole leaks. Replacement cost averages $8,000–$15,000.',
    icon: '🔧',
  },
  {
    category: 'Lead Paint',
    status: 'PROBABLE',
    headline: 'Lead paint assumed present',
    detail: 'Built before 1978 — Massachusetts law requires disclosure and deleading for units with children under 6. Assume lead paint on all original painted surfaces until professionally tested.',
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
//  PROMPTS
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

PERMIT HISTORY (${p.total || 0} total permits on record):
${permitList || 'No permits found'}
Permit flags: Boiler: ${p.summary?.hasBoiler ? 'YES' : 'No'} | Electrical: ${p.summary?.hasElectric ? 'YES' : 'No'} | Plumbing: ${p.summary?.hasPlumbing ? 'YES' : 'No'} | Roof: ${p.summary?.hasRoof ? 'YES' : 'No'}

Generate exactly 5 insights. Cover: construction era risks (wiring, pipes, lead paint), structural type, and at least one positive or monitored item if warranted.

Respond with ONLY a valid JSON array, no markdown, no preamble:
[
  {
    "category": "Electrical",
    "status": "RISK",
    "headline": "Short specific headline (max 8 words)",
    "detail": "2-3 sentences specific to this property — year built, permit dates, actual materials inferred. Never generic. Always actionable.",
    "icon": "⚡"
  }
]

Status values: RISK | INFERRED | PROBABLE | CONFIRMED | MONITOR | CLEAR
Icons: ⚡ electrical, 🔧 plumbing, ⚠ hazards, 🔥 structural/fire, 🏠 roof/exterior, 🌡 heating, ✓ clear`
}

function buildChatSystem(propertyData, element) {
  const a = propertyData?.assessor || {}
  const contactsList = Object.values(BOSTON_CONTACTS).map(cat =>
    `${cat.label}:\n` + cat.providers.map(p => `  • ${p.name} — ${p.phone} (${p.note})`).join('\n')
  ).join('\n\n')

  return `You are Mainten AI — an expert property advisor for Boston renters. Answer ANY question about this property, home maintenance, tenant rights, pest issues, or finding contractors.

PROPERTY:
- Address: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
- Type: ${a.luDesc || 'Residential'} · ${propertyData?.units?.count || '?'} units
- Heat: ${a.heatType || 'Unknown'} / ${a.heatSystem || 'Unknown'}
- Currently discussing: ${element?.name || 'General'}

BOSTON SERVICE CONTACTS — use these when asked for contractors, who to call, or how to fix something:
${contactsList}

RULES:
- Answer the user's ACTUAL question — never default to generic element description
- If asked about pest/rat/rodent issues → state it's landlord's responsibility (MA Sanitary Code 410.550) + give pest control contacts
- If asked for contacts or who to fix something → provide relevant name + phone number
- If asked about repairs → state landlord vs tenant responsibility first, then give contacts
- Reference the specific property's age and construction era
- Format with **bold** for key points and bullet lists
- Be direct, under 200 words, no filler phrases`
}

function buildDiagnosisPrompt(propertyData, element, issue) {
  const a = propertyData?.assessor || {}
  return `You are Mainten AI diagnosing a property issue.

Property: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
Type: ${a.luDesc || 'Residential'} · ${propertyData?.units?.count || '?'} units
Element: ${element.name}
Issue: "${issue}"

Respond with JSON ONLY, no markdown:
{
  "diagnosis": "2-3 sentence diagnosis specific to this property type and age",
  "responsibility": "LANDLORD",
  "responsibilityReason": "One sentence, Massachusetts Sanitary Code reference",
  "urgency": "URGENT",
  "urgencyReason": "One sentence",
  "jobBrief": "Professional job description for a tradesperson. 3-4 sentences including property type, construction era, problem, access notes.",
  "diyPossible": false,
  "diyNote": "Why professional needed or brief safe DIY if possible."
}
responsibility: LANDLORD | TENANT | SHARED
urgency: URGENT | SOON | MONITOR`
}

const DEMO_DIAGNOSIS = (elementName, issue, address) => ({
  diagnosis: `Based on the property's construction era and the reported issue with the ${elementName}, this is consistent with age-related deterioration common in pre-war Boston residential buildings. The materials used in early 1900s construction are at or beyond their expected service life.`,
  responsibility: 'LANDLORD',
  responsibilityReason: 'Under Massachusetts Sanitary Code Chapter II (105 CMR 410), landlords are responsible for maintaining all structural elements and mechanical systems in safe and working condition.',
  urgency: 'SOON',
  urgencyReason: 'Not immediately dangerous but should be addressed within 30 days to prevent worsening.',
  jobBrief: `Service required at ${address || 'the property'} — a pre-war Boston triple-decker. Issue: ${issue} affecting the ${elementName}. Property has original construction materials typical of pre-war balloon frame buildings. Contractor should note: building likely has original galvanised plumbing and knob-and-tube electrical — exercise caution with any penetrations. Please provide written scope and cost estimate before work begins.`,
  diyPossible: false,
  diyNote: 'Professional assessment recommended given the age of materials and potential interaction with original building systems.',
})

module.exports = {
  anthropic,
  HAS_API_KEY,
  DEMO_INSIGHTS,
  getDemoChatReply,
  buildInsightPrompt,
  buildChatSystem,
  buildDiagnosisPrompt,
  DEMO_DIAGNOSIS,
  BOSTON_CONTACTS,
}
