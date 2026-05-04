const { geminiGenerate, HAS_API_KEY, DEMO_INSIGHTS, buildInsightPrompt, stripJson } = require('./_helpers')

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
    const text = await geminiGenerate(buildInsightPrompt(propertyData))
    const insights = JSON.parse(stripJson(text))
    res.json({ insights, source: 'gemini' })
  } catch (err) {
    console.error('[insights]', err.message)
    res.json({ insights: DEMO_INSIGHTS, source: 'fallback' })
  }
}
