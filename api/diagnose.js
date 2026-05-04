const { anthropic, HAS_API_KEY, buildDiagnosisPrompt, DEMO_DIAGNOSIS } = require('./_helpers')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { issue, propertyData, element } = req.body
  if (!issue || !element) return res.status(400).json({ error: 'issue and element required' })

  if (!HAS_API_KEY) {
    return res.json({
      diagnosis: DEMO_DIAGNOSIS(element.name, issue, propertyData?.address),
      source: 'demo',
    })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: buildDiagnosisPrompt(propertyData, element, issue) }],
    })
    const text = message.content[0].text.trim()
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    res.json({ diagnosis: JSON.parse(clean), source: 'claude' })
  } catch (err) {
    console.error('[diagnose]', err.message)
    res.status(500).json({ error: 'AI unavailable' })
  }
}
