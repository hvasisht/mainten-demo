require('dotenv').config()
const express = require('express')
const cors = require('cors')
const Anthropic = require('@anthropic-ai/sdk')
const { getPropertyData } = require('./src/bostonData')

const app = express()
app.use(cors())
app.use(express.json())

const RAW_KEY = process.env.ANTHROPIC_API_KEY || ''
const HAS_API_KEY = RAW_KEY.length > 10 && !RAW_KEY.startsWith('your_')
const anthropic = new Anthropic({ apiKey: RAW_KEY })

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
//  ELEMENT CHAT PROMPT
// ──────────────────────────────────────────────────────────────
function buildChatSystemPrompt(propertyData, element) {
  const a = propertyData?.assessor || {}
  const yearBuilt = a.yearBuilt || 'unknown'
  return `You are Mainten AI — a specialist property advisor with deep knowledge of Boston residential buildings.

You are talking about the ${element.name} in this specific property:
- Address: ${propertyData?.address || 'Unknown'}
- Year Built: ${yearBuilt}
- Building Type: ${a.luDesc || 'Residential'}
- Heat Type: ${a.heatType || 'Unknown'}
- Structure: ${a.structureClass || 'Unknown'}
- Units: ${propertyData?.units?.count || 'Unknown'}

Element context: ${element.context}

RULES:
- Always reference the specific property (year built, building type, era-specific materials)
- Be direct and practical — this person is a renter making real decisions
- If asked about risk, state it clearly, then give actionable next steps
- Keep responses under 150 words unless a detailed technical explanation is needed
- Never start with "Great question" or filler — go straight to the answer`
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
    const prompt = buildInsightPrompt(propertyData)
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].text.trim()
    // Strip markdown code fences if present
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const insights = JSON.parse(clean)
    res.json({ insights, source: 'claude' })
  } catch (err) {
    console.error('[insights] Claude error — falling back to demo:', err.message)
    res.json({ insights: DEMO_INSIGHTS, source: 'fallback' })
  }
})

// POST /api/chat
// Body: { messages: [{role, content}], propertyData, element: {name, context} }
// Returns: { reply }
app.post('/api/chat', async (req, res) => {
  const { messages, propertyData, element } = req.body
  if (!messages || !element) return res.status(400).json({ error: 'messages and element required' })

  if (!HAS_API_KEY) {
    const demoReplies = {
      'Boiler / Heating': `This building was constructed in 1914, making it almost certainly original to steam radiator heating — a cast iron boiler in the basement distributing heat through two-pipe steam. These systems are reliable when maintained but need annual bleeding of radiators and boiler water level checks. The hissing or knocking you sometimes hear is normal — radiators releasing air. Ask your landlord when the boiler was last serviced and whether the pressure relief valve has been tested. A well-maintained 1914 steam system can outlast modern equipment.`,
      'Electrical Panel': `In a 1914 triple-decker, the original knob-and-tube wiring is the primary concern. Even if a 2019 electrical permit upgraded the service panel to 200A, the wiring inside the walls is almost certainly original. Knob-and-tube is not grounded, cannot handle modern loads safely, and most homeowner's insurance policies won't cover a home with it. You can identify it in the basement — look for white ceramic knobs stapled to joists with single wires running between them. Do not plug high-draw appliances into original outlets.`,
      'Kitchen Sink / Pipes': `Without a plumbing permit on record, these pipes are almost certainly original galvanised iron — standard in 1914 Boston construction. After 110 years, galvanised develops interior corrosion that turns water slightly yellow and reduces pressure. If you see orange tint in cold water first thing in the morning, that's confirming it. The corrosion is not immediately dangerous but the pipes are near end of life. Document any water discolouration with photos and timestamps — this is a landlord responsibility.`,
      'Bathroom': `The bathroom sits directly above the kitchen in a 1914 triple-decker stack — this is standard balloon frame layout with the plumbing chase running through all three floors. The cast iron drain stack is likely original and in decent condition (cast iron is extremely durable) but the supply lines are almost certainly galvanised. If you see evidence of past leaks on the ceiling below, document it immediately — this indicates the drain connections may need attention. The tile work and fixtures are almost certainly renovated.`,
      'Front Wall': `This is a load-bearing balloon frame wall — the structural spine of the building running from foundation to roof plate. Do not under any circumstances drill into this wall without knowing what's behind it. In 1914 construction, the wall cavity runs continuously from basement to attic with no fire blocking. Wiring, pipes, and sometimes original gas lines run through these cavities. If you want to hang anything heavy, use a stud finder and drill into studs only. Never remove trim or open this wall without landlord permission.`,
      'Roof Access': `The roof access stairwell in a Boston triple-decker is the building's fire egress priority. The roof itself is likely a flat tar-and-gravel or modified bitumen system — standard for this era and building type. If the roof was replaced or repaired recently per permits, check for the permit documentation. Signs of trouble to watch for: water staining on the top floor ceiling, soft spots near the stairwell roof hatch, or pooling water visible from outside. Report any ceiling staining immediately — water infiltration in a balloon frame building spreads fast.`,
    }
    const key = Object.keys(demoReplies).find(k => element.name.includes(k.split(' ')[0])) || Object.keys(demoReplies)[0]
    return res.json({ reply: demoReplies[key] })
  }

  try {
    const systemPrompt = buildChatSystemPrompt(propertyData, element)
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    res.json({ reply: message.content[0].text })
  } catch (err) {
    console.error('[chat] Claude error:', err.message)
    res.status(500).json({ error: 'AI unavailable' })
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
    const prompt = buildDiagnosisPrompt(propertyData, element, issue)
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].text.trim()
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const diagnosis = JSON.parse(clean)
    res.json({ diagnosis, source: 'claude' })
  } catch (err) {
    console.error('[diagnose] Claude error:', err.message)
    res.status(500).json({ error: 'AI unavailable' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Mainten API running on http://localhost:${PORT}`))
