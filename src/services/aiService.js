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

      const jsonResponse = await response.json()

      if (!response.ok || jsonResponse.success === false) {
        throw new Error(`La API respondió con error: ${jsonResponse.message || response.status}`)
      }

      const bestMatch = jsonResponse.result || (jsonResponse.predictions && jsonResponse.predictions[0])

      if (!bestMatch) {
        throw new Error('La IA no pudo identificar ninguna roca en la imagen.')
      }

      return {
        rockName: bestMatch.scientific_name || bestMatch.label,
        confidence: bestMatch.confidence,
        catalog: bestMatch.catalog || bestMatch
      }
    } catch (error) {
      throw new HttpError(502, 'Error al comunicarse con la IA: ' + error.message)
    }
  }
})

module.exports = { createAiService }