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
    // Pass the full messages array so the demo can read the actual question
    return res.json({ reply: getDemoChatReply(messages, element) })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: buildChatSystem(propertyData, element),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    res.json({ reply: message.content[0].text })
  } catch (err) {
    console.error('[chat]', err.message)
    // Fall back to demo if Claude fails
    res.json({ reply: getDemoChatReply(messages, element) })
  }
}
