// Extracts readable text from uploaded documents (PDF, txt, etc.)
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { fileBase64, mimeType } = req.body
  if (!fileBase64) return res.status(400).json({ error: 'fileBase64 required' })

  try {
    const buffer = Buffer.from(fileBase64, 'base64')

    if (mimeType === 'application/pdf') {
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(buffer)
      return res.json({ text: data.text.replace(/\s+/g, ' ').trim().slice(0, 12000) })
    }

    // For .txt, .rtf, .csv — decode as UTF-8
    return res.json({ text: buffer.toString('utf-8').trim().slice(0, 12000) })
  } catch (err) {
    console.error('[extract-doc]', err.message)
    return res.status(500).json({ error: 'Could not extract text', details: err.message })
  }
}
