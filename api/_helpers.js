// Shared helpers for Vercel serverless API functions
const Anthropic = require('@anthropic-ai/sdk')

const RAW_KEY = process.env.ANTHROPIC_API_KEY || ''
const HAS_API_KEY = RAW_KEY.length > 10 && !RAW_KEY.startsWith('your_')
const anthropic = new Anthropic({ apiKey: RAW_KEY })

// ──────────────────────────────────────────────────────────────
//  DEMO FALLBACK — works without Claude API key
// ──────────────────────────────────────────────────────────────
const DEMO_INSIGHTS = [
  {
    category: 'Electrical',
    status: 'RISK',
    headline: 'Knob-and-tube wiring probable in walls',
    detail: 'Built before 1940 — electrical wiring predates modern standards. Any permit on record likely upgraded the service panel only. Original knob-and-tube wiring in wall cavities is typical for this era and is not covered by modern homeowner\'s insurance.',
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

const DEMO_CHAT = {
  'Boiler': 'This building\'s heating system is almost certainly a cast iron steam boiler — standard for pre-war Boston triple-deckers. These systems distribute heat through two-pipe steam radiators on all floors. They\'re reliable when maintained but need annual servicing: boiler water level check, pressure relief valve test, and radiator bleeding. The hissing and knocking sounds you sometimes hear are normal — air escaping from radiators. A well-maintained 1914 steam system can outlast modern equipment. Ask your landlord when it was last serviced.',
  'Electrical': 'In a pre-war triple-decker, the primary concern is knob-and-tube wiring in the walls. Even if a permit upgraded the service panel to 200A, the wiring inside the walls is almost certainly original. Knob-and-tube is not grounded, cannot handle modern electrical loads safely, and most homeowner\'s insurance policies won\'t cover a home with it. You can identify it in the basement — look for white ceramic knobs stapled to joists with single wires running between them. Avoid plugging high-draw appliances (space heaters, microwaves) into original outlets.',
  'Kitchen': 'Without a recent plumbing permit, these pipes are almost certainly original galvanised iron. After 100+ years, galvanised develops interior corrosion that turns water slightly yellow and reduces pressure. If you see orange tint in cold water first thing in the morning, that\'s confirming it. The corrosion isn\'t immediately dangerous but the pipes are near end of life. Document any discolouration with photos and timestamps — this is a landlord responsibility under Massachusetts Sanitary Code.',
  'Bathroom': 'The bathroom sits directly above the kitchen in a triple-decker stack — standard balloon frame layout with the plumbing chase running through all three floors. The cast iron drain stack is likely original and durable, but supply lines are almost certainly galvanised. If you see evidence of past leaks on the ceiling below, document it immediately. That indicates drain connections may need attention. The tile and fixtures are almost certainly renovated — the structure behind them is original.',
  'Front': 'This is a load-bearing balloon frame wall — the structural spine of the building running from foundation to roof plate. Never drill into this wall without knowing what\'s behind it. In pre-war construction, the wall cavity runs continuously from basement to attic with no fire blocking. Wiring, pipes, and sometimes original gas lines run through these cavities. To hang anything heavy: use a stud finder, drill into studs only, and never remove trim or open the wall without landlord permission.',
  'Roof': 'The roof access stairwell is the building\'s fire egress priority. The roof itself is likely a flat tar-and-gravel or modified bitumen system — standard for Boston triple-deckers. Signs of trouble: water staining on the top floor ceiling, soft spots near the stairwell hatch, or pooling water visible from outside. Report any ceiling staining immediately — water infiltration in a balloon frame building spreads fast through the unblocked wall cavities.',
}

function getDemoChatReply(elementName) {
  const key = Object.keys(DEMO_CHAT).find(k => elementName.includes(k)) || 'Boiler'
  return DEMO_CHAT[key]
}

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
  return `You are Mainten AI — a specialist property advisor for Boston residential buildings.

Property: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
Type: ${a.luDesc || 'Residential'} · ${propertyData?.units?.count || '?'} units
Heat: ${a.heatType || 'Unknown'} / ${a.heatSystem || 'Unknown'}

Element: ${element.name}
Context: ${element.context}

Rules: Reference the specific property. Be direct and practical. Under 150 words unless a technical explanation is needed. No filler phrases.`
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
}
