const { HttpError } = require('../utils/httpError')

const createAiService = () => ({
  async identifyRock(base64Image) {
    try {
      const response = await fetch(process.env.GEODEX_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GEODEX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: { base64: base64Image, mime_type: 'image/jpeg' },
          top_k: 1
        })
      })

      if (!response.ok) {
        throw new Error(`La API respondió con estado ${response.status}`)
      }

      const data = await response.json()
      const bestMatch = data.results[0] 
      
      return {
        rockId: bestMatch.id,
        confidence: Math.round(bestMatch.confidence * 100)
      }
    } catch (error) {
      throw new HttpError(502, 'Error al comunicarse con la IA: ' + error.message)
    }
  }
})

module.exports = { createAiService }