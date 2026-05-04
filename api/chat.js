const { geminiChat, HAS_API_KEY, getDemoChatReply, buildChatSystem } = require('./_helpers')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, propertyData, element } = req.body
  if (!messages || !element) return res.status(400).json({ error: 'messages and element required' })

  if (!HAS_API_KEY) {
    return res.json({ reply: getDemoChatReply(messages, element), source: 'demo' })
  }

  try {
    const reply = await geminiChat(buildChatSystem(propertyData, element), messages)
    res.json({ reply, source: 'gemini' })
  } catch (err) {
    console.error('[chat]', err.message)
    // Graceful fallback so the demo still works
    res.json({ reply: getDemoChatReply(messages, element), source: 'fallback' })
  }
}
