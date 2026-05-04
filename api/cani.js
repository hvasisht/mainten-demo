const { anthropic, HAS_API_KEY } = require('./_helpers')

const DEMO_ANSWERS = {
  'drill':      { answer: 'Check first. In a pre-war triple-decker, wall cavities run unblocked from basement to roof — wiring, pipes, and gas lines all share that space. Use a stud finder before drilling anywhere. Into studs: safe. Between studs in an exterior wall: always check for knob-and-tube wiring first with a non-contact voltage tester ($15 at any hardware store).', safe: 'CAUTION' },
  'showerhead': { answer: 'Yes — with one caveat. Turn off the water supply valve under the sink first. Galvanised pipe this age can have slightly weakened threads, so hand-tighten then one quarter-turn with pliers only. Do not overtighten. If the fitting looks corroded or the pipe moves when you apply pressure, stop and notify your landlord — this is a sign of wider pipe deterioration.', safe: 'YES' },
  'shelves':    { answer: 'Yes, into studs only. Plaster-over-lath walls in a 1914 building are harder to find studs in than drywall — a magnetic stud finder works better than electronic ones here (finds the nails in the lath). Keep shelf loads under 30lbs per stud anchor. Avoid the party wall (wall shared with next unit) entirely — you cannot know what\'s running through it.', safe: 'YES' },
  'wear':       { answer: 'Massachusetts law is specific: normal wear and tear is the landlord\'s responsibility, never the tenant\'s. This includes: paint fading or minor scuffs, carpet wear from normal use, minor wall marks, loose door handles, dripping faucets. It does NOT include: holes in walls, stains, broken fixtures, or anything caused by negligence. Document the current condition with timestamped photos — this is your strongest protection at move-out.', safe: 'INFO' },
  'command':    { answer: 'Yes — Command strips work on plaster walls but with limits. Max weight per strip is lower on plaster than drywall (about 60% of the stated max). Avoid velvet or textured surfaces. The critical rule: when removing them, pull the tab STRAIGHT DOWN parallel to the wall, very slowly. Pulling outward pulls a chunk of plaster with it. Pre-1940 plaster is more brittle than modern surfaces.', safe: 'YES' },
  'paint':      { answer: 'Check your lease first — most Boston leases require landlord permission for paint. If approved: use a primer designed for lead paint encapsulation (do not sand existing paint — this releases lead dust). Return walls to original colour before move-out or factor repainting into your move-out plan. Keep the paint tin and a photo of the colour match.', safe: 'CAUTION' },
}

function getDemoAnswer(question) {
  const q = question.toLowerCase()
  if (q.includes('drill') || q.includes('wall') || q.includes('hole')) return DEMO_ANSWERS.drill
  if (q.includes('shower') || q.includes('plumb') || q.includes('faucet') || q.includes('tap')) return DEMO_ANSWERS.showerhead
  if (q.includes('shelf') || q.includes('shelv') || q.includes('hang') || q.includes('mount')) return DEMO_ANSWERS.shelves
  if (q.includes('wear') || q.includes('damage') || q.includes('deposit') || q.includes('move out') || q.includes('landlord')) return DEMO_ANSWERS.wear
  if (q.includes('command') || q.includes('strip') || q.includes('adhesive') || q.includes('hook')) return DEMO_ANSWERS.command
  if (q.includes('paint') || q.includes('colour') || q.includes('color')) return DEMO_ANSWERS.paint
  return {
    answer: 'In a pre-war Boston triple-decker, the general rule is: anything involving the building structure, original systems (heating, plumbing, electrical), or shared walls requires landlord notification first. Document what you\'re doing with before-and-after photos. If in doubt, ask in writing so there\'s a paper trail.',
    safe: 'CAUTION',
  }
}

function buildCanIPrompt(question, propertyData) {
  const a = propertyData?.assessor || {}
  return `You are Mainten AI answering a renter's "Can I?" question about their home.

Property: ${propertyData?.address || 'Unknown'}, built ${a.yearBuilt || 'unknown'}
Type: ${a.luDesc || 'Residential'} · Heat: ${a.heatType || 'Unknown'}

Question: "${question}"

Answer with a JSON object ONLY, no markdown:
{
  "answer": "Direct practical answer in 3-5 sentences. Specific to this property's age and construction. Include any safety precautions or steps needed.",
  "safe": "YES | NO | CAUTION | INFO"
}

YES = they can do it freely. CAUTION = they can but with specific care. NO = they should not / need landlord permission. INFO = informational, no clear yes/no.`
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { question, propertyData } = req.body
  if (!question) return res.status(400).json({ error: 'question required' })

  if (!HAS_API_KEY) {
    return res.json(getDemoAnswer(question))
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: buildCanIPrompt(question, propertyData) }],
    })
    const text = message.content[0].text.trim()
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    res.json(JSON.parse(clean))
  } catch (err) {
    console.error('[cani]', err.message)
    res.json(getDemoAnswer(question))
  }
}
