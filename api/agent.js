/**
 * Mainten Agent — Gemini-powered ReAct agent with tool use (function calling)
 *
 * GenAI Concepts Demonstrated:
 *   - Agent systems (ReAct pattern: Reason → Act → Observe loop)
 *   - Tool use / Function calling (Gemini function declarations)
 *   - Simulated RAG (knowledge base retrieval via tool)
 *   - Structured output (JSON-schema enforced diagnosis)
 *
 * Course: DADS5250-GenAI
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')
const { BOSTON_CONTACTS, DEMO_DIAGNOSIS, buildDiagnosisPrompt, stripJson } = require('./_helpers')

const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const HAS_API_KEY = GEMINI_KEY.length > 10 && !GEMINI_KEY.startsWith('your_')
const genAI = HAS_API_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null

// ──────────────────────────────────────────────────────────────
//  KNOWLEDGE BASE — Simulated RAG for MA Housing Regulations
//  In a production RAG system, these documents would be chunked,
//  embedded, stored in a vector store (e.g. pgvector / Pinecone),
//  and retrieved via cosine similarity search at query time.
//  Here we simulate retrieval with a structured knowledge base.
// ──────────────────────────────────────────────────────────────
const HOUSING_REGULATIONS = {
  heat: {
    code: '105 CMR 410.201',
    rule: 'Landlords must maintain 68°F (7am–11pm) and 64°F (11pm–7am) from September 15 to June 15.',
    responsibility: 'LANDLORD',
    action: 'Report failures immediately to Boston Inspectional Services: (617) 635-5300. Landlord has 24 hours to restore heat.',
  },
  pests: {
    code: '105 CMR 410.550',
    rule: 'Owners must maintain dwelling units free from rodents, insect infestations, and other pests. Extermination is the owner\'s responsibility in all units.',
    responsibility: 'LANDLORD',
    action: 'Notify landlord in writing. If no response within 24 hours, contact Boston Inspectional: (617) 635-5300.',
  },
  repairs: {
    code: '105 CMR 410.500',
    rule: 'Owners must maintain all structural elements, mechanical systems, and facilities in good repair and safe working condition.',
    responsibility: 'LANDLORD',
    action: 'Document issues with dated photos and send written notice to landlord with a reasonable repair deadline.',
  },
  lead_paint: {
    code: 'MGL Chapter 111 §§197',
    rule: 'Buildings built before 1978 presumed to contain lead paint. If children under 6 are present, landlord must deleach to safe levels.',
    responsibility: 'LANDLORD',
    action: 'Contact MA Childhood Lead Poisoning Prevention Program: (800) 532-9571. Never sand or scrape original paint.',
  },
  electrical: {
    code: '105 CMR 410.351',
    rule: 'Every dwelling must have safe electrical wiring and sufficient outlets maintained by the owner. Knob-and-tube does not meet modern code.',
    responsibility: 'LANDLORD',
    action: 'Do not overload circuits. Report electrical hazards to landlord in writing. Emergency: Boston ISD (617) 635-5300.',
  },
  plumbing: {
    code: '105 CMR 410.180',
    rule: 'Owners must provide and maintain adequate plumbing including hot and cold running water at required pressures.',
    responsibility: 'LANDLORD',
    action: 'Photograph the issue and notify landlord in writing. Active leaks: call emergency plumber and bill the landlord.',
  },
  general: {
    code: '105 CMR 410',
    rule: 'Massachusetts Sanitary Code requires landlords to maintain all aspects of rental units in habitable condition.',
    responsibility: 'LANDLORD',
    action: 'Contact Greater Boston Legal Services for free tenant legal assistance: (617) 603-1700.',
  },
}

// Construction-era risk knowledge base — retrieved by system + year_built
const CONSTRUCTION_RISKS = {
  electrical: {
    pre1940: { level: 'HIGH',   detail: 'Knob-and-tube wiring almost certainly present in wall cavities. Cannot be insulated. Not covered by modern homeowners insurance. Typical panel is 60 amps vs modern 200 amp minimum.' },
    pre1960: { level: 'MEDIUM', detail: 'Panel likely upgraded but original branch wiring may remain. Some 1965–1973 buildings have aluminum wiring which can loosen and arc at connections.' },
    modern:  { level: 'LOW',    detail: 'Modern copper wiring with grounded outlets. Standard maintenance and GFCI protection in wet areas.' },
  },
  plumbing: {
    pre1940: { level: 'HIGH',   detail: 'Galvanised iron supply pipes at or beyond 80-year service life. Internal corrosion reduces pressure and discolors water. Cast iron drain lines are durable but joints may fail.' },
    pre1960: { level: 'MEDIUM', detail: 'Mixed galvanised and copper supply lines common. Some original galvanised sections likely remain in walls even if exposed runs were replaced.' },
    modern:  { level: 'LOW',    detail: 'Copper or PVC plumbing in normal condition. Standard maintenance and leak inspection applies.' },
  },
  lead_paint: {
    pre1940: { level: 'HIGH',   detail: 'Lead paint assumed on all original surfaces — walls, windows, trim, doors. Multiple paint layers common. Pre-1940 buildings may have lead-based paint on every painted surface.' },
    pre1960: { level: 'HIGH',   detail: 'Lead paint present in all pre-1978 sections. Test before any renovation. Children under 6 trigger mandatory deleading under MA law.' },
    modern:  { level: 'NONE',   detail: 'Post-1978 construction. Lead-based paint was federally banned. No lead paint concern.' },
  },
  structural: {
    pre1940: { level: 'MEDIUM', detail: 'Balloon frame construction with continuous wall cavities from foundation to roof. Fire spreads between floors in under 90 seconds with no blocking. No modern cross-bracing.' },
    pre1960: { level: 'LOW',    detail: 'Platform frame with per-floor fire blocking. More fire-resistant than balloon frame. Older materials but structurally sound with maintenance.' },
    modern:  { level: 'LOW',    detail: 'Modern platform or steel frame with fire-blocking and cross-bracing. Code compliant.' },
  },
  hvac: {
    pre1940: { level: 'MEDIUM', detail: 'Steam or hot-water boiler with cast iron radiators. Two-pipe steam systems are prone to water hammer (loud banging). Boilers installed before 1990 may be at end of service life.' },
    pre1960: { level: 'LOW',    detail: 'Forced hot water or steam. Boiler may have been replaced. Check nameplate for age. Pipes and radiators are durable if maintained.' },
    modern:  { level: 'LOW',    detail: 'Modern forced air, heat pump, or hydronic system. Standard maintenance and filter replacement applies.' },
  },
  asbestos: {
    pre1940: { level: 'HIGH',   detail: 'Asbestos used extensively in pipe insulation (often grey wrap on steam pipes), floor tiles, ceiling tiles, and roofing. Do not disturb. Professional abatement required.' },
    pre1960: { level: 'HIGH',   detail: 'Asbestos still widely used until the mid-1970s. Pipe wrap insulation and 9-inch floor tiles are common sources. Assume present until tested.' },
    modern:  { level: 'NONE',   detail: 'Post-1980 construction. Asbestos materials not permitted. No asbestos concern.' },
  },
}

function getConstructionEra(yearBuilt) {
  if (!yearBuilt || parseInt(yearBuilt) < 1940) return 'pre1940'
  if (parseInt(yearBuilt) < 1960) return 'pre1960'
  return 'modern'
}

// ──────────────────────────────────────────────────────────────
//  TOOL DEFINITIONS (Gemini function declarations format)
// ──────────────────────────────────────────────────────────────
const AGENT_TOOLS = [{
  functionDeclarations: [
    {
      name: 'lookup_housing_regulation',
      description: 'Retrieves Massachusetts housing law and Sanitary Code (105 CMR 410) for a specific topic. Use this to determine landlord vs tenant responsibility and get the legal code reference.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['heat', 'pests', 'repairs', 'lead_paint', 'electrical', 'plumbing', 'general'],
            description: 'The housing regulation topic to retrieve',
          },
        },
        required: ['topic'],
      },
    },
    {
      name: 'assess_construction_risk',
      description: 'Assesses health, safety, and maintenance risk for a specific building system based on the construction era. Always call this for issues involving electrical, plumbing, HVAC, lead paint, asbestos, or structural concerns.',
      parameters: {
        type: 'object',
        properties: {
          year_built: {
            type: 'number',
            description: 'Year the building was constructed (use 0 if unknown)',
          },
          system: {
            type: 'string',
            enum: ['electrical', 'plumbing', 'lead_paint', 'asbestos', 'hvac', 'structural'],
            description: 'Building system to assess risk for',
          },
        },
        required: ['year_built', 'system'],
      },
    },
    {
      name: 'get_service_contacts',
      description: 'Returns Boston-area licensed service provider contacts for a specific trade. Use this when professional service is needed.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['plumbing', 'electrical', 'hvac', 'pest', 'roofing', 'general', 'tenant'],
            description: 'Service trade category',
          },
        },
        required: ['category'],
      },
    },
  ],
}]

// ──────────────────────────────────────────────────────────────
//  TOOL EXECUTORS
// ──────────────────────────────────────────────────────────────
function executeTool(name, args) {
  if (name === 'lookup_housing_regulation') {
    return HOUSING_REGULATIONS[args.topic] || HOUSING_REGULATIONS.general
  }
  if (name === 'assess_construction_risk') {
    const systemRisks = CONSTRUCTION_RISKS[args.system]
    if (!systemRisks) return { level: 'UNKNOWN', detail: 'System not in knowledge base.' }
    const era = getConstructionEra(args.year_built)
    return { era, yearBuilt: args.year_built, ...systemRisks[era] }
  }
  if (name === 'get_service_contacts') {
    const cat = BOSTON_CONTACTS[args.category]
    if (!cat) return { error: 'Category not found' }
    return { label: cat.label, providers: cat.providers }
  }
  return { error: `Unknown tool: ${name}` }
}

// ──────────────────────────────────────────────────────────────
//  GEMINI REACT AGENT LOOP
//  Pattern: Reason → Act (function call) → Observe (result) → repeat
//  Max 6 iterations to prevent runaway loops
// ──────────────────────────────────────────────────────────────
async function runDiagnosisAgent(issue, element, propertyData, imageBase64, imageMimeType) {
  const a = propertyData?.assessor || {}
  const yearBuilt = parseInt(a.yearBuilt) || null
  const p = propertyData?.permits || {}
  const recentPermits = (p.records || []).slice(0, 5)
    .map(r => `${r.issuedDate?.slice(0, 4) || '?'}: ${r.type} — ${r.description || 'N/A'}`)
    .join('\n') || 'None on record'

  const hasImage = !!(imageBase64 && imageMimeType)

  const systemInstruction = `You are Mainten Agent, an AI property intelligence agent specializing in Boston residential properties. You help residents understand maintenance issues, determine responsibility under Massachusetts law, and get professional help.
${hasImage ? '\nA photo of the issue has been provided. Analyze it carefully — describe what you can visually observe (damage, wear, water stains, mold, rust, etc.) and factor this into your diagnosis.\n' : ''}
You MUST use your tools to gather evidence before forming your diagnosis:
1. Call assess_construction_risk to understand hazards given the building's age
2. Call lookup_housing_regulation to determine legal responsibility
3. Call get_service_contacts if professional service is needed

After using your tools, output your final diagnosis as a single JSON object with EXACTLY these fields:
{
  "diagnosis": "2-3 sentences specific to this property type, age, and the reported issue. Reference construction era findings.${hasImage ? ' Include what is visually visible in the photo.' : ''}",
  "responsibility": "LANDLORD" or "TENANT" or "SHARED",
  "responsibilityReason": "One sentence citing the specific MA law or code section retrieved",
  "urgency": "URGENT" or "SOON" or "MONITOR",
  "urgencyReason": "One sentence explaining the urgency based on construction-era risk level",
  "jobBrief": "Professional job description for a tradesperson: 3-4 sentences including address, building type, construction era, specific problem, and access notes",
  "diyPossible": true or false,
  "diyNote": "Why professional required, or brief safe DIY steps if possible"
}

Output ONLY the JSON — no markdown fences, no preamble, no explanation.`

  const textMessage = `Property: ${propertyData?.address || 'Unknown'}
Year built: ${yearBuilt || 'unknown'} (${a.luDesc || 'Residential'}, ${propertyData?.units?.count || '?'} units)
Heat system: ${a.heatType || 'Unknown'} / ${a.heatSystem || 'Unknown'}
Recent permits:
${recentPermits}

Reported element: ${element.name}
Issue described: "${issue}"
${hasImage ? '\nA photo of the issue is attached. Please analyze it along with the description above.' : ''}
Research this issue using your tools, then output your diagnosis JSON.`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
    tools: AGENT_TOOLS,
  })

  const chat = model.startChat()
  const toolsUsed = []

  // If image provided, send as multimodal message (text + image parts)
  const firstMessage = hasImage
    ? [{ inlineData: { data: imageBase64, mimeType: imageMimeType } }, { text: textMessage }]
    : textMessage

  let result = await chat.sendMessage(firstMessage)

  // ReAct agent loop — keep going while Gemini wants to call functions
  for (let iteration = 0; iteration < 6; iteration++) {
    const response = result.response
    const functionCalls = response.functionCalls()

    // No more function calls — agent has finished reasoning
    if (!functionCalls || functionCalls.length === 0) {
      const text = response.text().trim()
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      return { diagnosis: JSON.parse(cleaned), toolsUsed }
    }

    // Execute each tool the agent called and collect results
    const functionResponses = []
    for (const call of functionCalls) {
      const toolResult = executeTool(call.name, call.args)
      toolsUsed.push({ tool: call.name, input: call.args, result: toolResult })
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      })
    }

    // Feed tool results back to the agent
    result = await chat.sendMessage(functionResponses)
  }

  throw new Error('Agent loop ended without producing a diagnosis')
}

// ──────────────────────────────────────────────────────────────
//  VERCEL SERVERLESS HANDLER
// ──────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { issue, propertyData, element, imageBase64, imageMimeType } = req.body
  if (!issue || !element) return res.status(400).json({ error: 'issue and element required' })

  // Demo mode — no API key
  if (!HAS_API_KEY) {
    return res.json({
      diagnosis: DEMO_DIAGNOSIS(element.name, issue, propertyData?.address),
      toolsUsed: [
        { tool: 'assess_construction_risk', input: { year_built: 1920, system: 'hvac' }, result: { level: 'MEDIUM', detail: 'Steam boiler system typical of pre-1940 construction.' } },
        { tool: 'lookup_housing_regulation', input: { topic: 'repairs' }, result: HOUSING_REGULATIONS.repairs },
      ],
      source: 'demo',
    })
  }

  try {
    const { diagnosis, toolsUsed } = await runDiagnosisAgent(issue, element, propertyData, imageBase64, imageMimeType)
    res.json({ diagnosis, toolsUsed, source: 'mainten-agent', hasImage: !!(imageBase64) })
  } catch (err) {
    console.error('[agent] Mainten Agent failed:', err.message)
    // Graceful fallback to single-shot Gemini diagnosis
    try {
      const { geminiGenerate } = require('./_helpers')
      const text = await geminiGenerate(buildDiagnosisPrompt(propertyData, element, issue))
      const diagnosis = JSON.parse(stripJson(text))
      res.json({ diagnosis, toolsUsed: [], source: 'gemini-fallback' })
    } catch (fallbackErr) {
      console.error('[agent] Fallback also failed:', fallbackErr.message)
      res.json({
        diagnosis: DEMO_DIAGNOSIS(element.name, issue, propertyData?.address),
        toolsUsed: [],
        source: 'fallback',
      })
    }
  }
}
