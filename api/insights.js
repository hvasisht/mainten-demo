const { anthropic, HAS_API_KEY, DEMO_INSIGHTS, buildInsightPrompt } = require('./_helpers')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { propertyData } = req.body
  if (!propertyData) return res.status(400).json({ error: 'propertyData required' })

  if (!HAS_API_KEY) {
    return res.json({ insights: DEMO_INSIGHTS, source: 'demo' })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildInsightPrompt(propertyData) }],
    })
    const text = message.content[0].text.trim()
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    res.json({ insights: JSON.parse(clean), source: 'claude' })
  } catch (err) {
    console.error('[insights]', err.message)
    res.json({ insights: DEMO_INSIGHTS, source: 'fallback' })
  }
}
