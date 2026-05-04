const { anthropic, HAS_API_KEY, getDemoChatReply, buildChatSystem } = require('./_helpers')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, propertyData, element } = req.body
  if (!messages || !element) return res.status(400).json({ error: 'messages and element required' })

  if (!HAS_API_KEY) {
    return res.json({ reply: getDemoChatReply(element.name) })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 400,
      system: buildChatSystem(propertyData, element),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    res.json({ reply: message.content[0].text })
  } catch (err) {
    console.error('[chat]', err.message)
    res.status(500).json({ error: 'AI unavailable' })
  }
}
