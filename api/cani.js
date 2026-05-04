const { geminiGenerate, HAS_API_KEY, stripJson, buildCanIPrompt, getDemoChatReply } = require('./_helpers')

const DEMO_ANSWERS = {
  drill:      { answer: 'Check first. In a pre-war triple-decker, wall cavities run unblocked from basement to roof — wiring, pipes, and gas lines share that space. Use a stud finder before drilling. Into studs: safe. Into an exterior wall cavity: check for knob-and-tube wiring first with a non-contact voltage tester ($15 at any hardware store).', safe: 'CAUTION' },
  showerhead: { answer: 'Yes — with one caveat. Turn off the water supply valve first. Galvanised pipe this age can have weakened threads, so hand-tighten then one quarter-turn with pliers only. If the fitting looks corroded or the pipe moves when you apply pressure, stop and notify your landlord — sign of wider pipe deterioration.', safe: 'YES' },
  shelves:    { answer: 'Yes, into studs only. Plaster-over-lath walls in a pre-war building are harder to find studs in than drywall — a magnetic stud finder works better here (finds the nails in the lath). Keep shelf loads under 30lbs per stud anchor. Avoid the party wall shared with the next unit entirely.', safe: 'YES' },
  wear:       { answer: 'Massachusetts law is specific: normal wear and tear is the landlord\'s responsibility, never the tenant\'s. This includes paint fading, minor scuffs, carpet wear from normal use, minor wall marks, loose door handles, dripping faucets. Document the current condition with timestamped photos — your strongest protection at move-out.', safe: 'INFO' },
  command:    { answer: 'Yes — Command strips work on plaster walls but at about 60% of the stated max weight. The critical rule: when removing them, pull the tab STRAIGHT DOWN parallel to the wall, very slowly. Pulling outward pulls a chunk of plaster with it. Pre-1940 plaster is more brittle than modern surfaces.', safe: 'YES' },
  paint:      { answer: 'Check your lease first — most Boston leases require landlord permission for paint. If approved: use a primer designed for lead paint encapsulation (never sand existing paint). Return walls to original colour before move-out. Keep the paint tin and a photo of the colour match.', safe: 'CAUTION' },
}

function getDemoAnswer(question) {
  const q = question.toLowerCase()
  // Specific matches first to avoid false positives (e.g. "shelves on walls" hitting 'wall')
  if (/shelf|shelv|hang|mount/.test(q))                      return DEMO_ANSWERS.shelves
  if (/command|strip|adhesive|hook/.test(q))                 return DEMO_ANSWERS.command
  if (/paint|colour|color/.test(q))                          return DEMO_ANSWERS.paint
  if (/shower|faucet|tap|plumb/.test(q))                     return DEMO_ANSWERS.showerhead
  if (/wear|damage|deposit|move.?out|landlord/.test(q))      return DEMO_ANSWERS.wear
  if (/drill|hole|wall/.test(q))                             return DEMO_ANSWERS.drill
  return { answer: 'In a pre-war Boston triple-decker, anything involving the building structure or original systems requires landlord notification first. Document what you\'re doing with before-and-after photos. If in doubt, ask in writing.', safe: 'CAUTION' }
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
    return res.json({ ...getDemoAnswer(question), source: 'demo' })
  }

  try {
    const text = await geminiGenerate(buildCanIPrompt(question, propertyData))
    const result = JSON.parse(stripJson(text))
    res.json({ ...result, source: 'gemini' })
  } catch (err) {
    console.error('[cani]', err.message)
    res.json({ ...getDemoAnswer(question), source: 'fallback' })
  }
}
