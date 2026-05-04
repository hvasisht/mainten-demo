const { getPropertyData } = require('../backend/src/bostonData')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { address } = req.query
  if (!address) return res.status(400).json({ error: 'address required' })
  try {
    const data = await getPropertyData(address)
    res.json(data)
  } catch (err) {
    console.error('[property]', err.message)
    res.status(500).json({ error: err.message })
  }
}
