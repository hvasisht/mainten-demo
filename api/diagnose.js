const { geminiGenerate, HAS_API_KEY, buildDiagnosisPrompt, DEMO_DIAGNOSIS, stripJson } = require('./_helpers')

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
    const text = await geminiGenerate(buildDiagnosisPrompt(propertyData, element, issue))
    const diagnosis = JSON.parse(stripJson(text))
    res.json({ diagnosis, source: 'gemini' })
  } catch (err) {
    console.error('[diagnose]', err.message)
    res.json({
      diagnosis: DEMO_DIAGNOSIS(element.name, issue, propertyData?.address),
      source: 'fallback',
    })
  }
}
