const { HttpError } = require('../utils/httpError')

const getApiOrigin = (apiUrl) => {
  try {
    const parsed = new URL(apiUrl)
    return parsed.origin
  } catch {
    return ''
  }
}

const buildAuthHeaders = () => ({
  ...(process.env.GEODEX_API_KEY ? { Authorization: `Bearer ${process.env.GEODEX_API_KEY}` } : {}),
  'Content-Type': 'application/json'
})

const createAiService = () => ({
  async fetchSpecimenByNameOrId({ name, specimenId }) {
    const apiUrl = process.env.GEODEX_API_URL
    const origin = getApiOrigin(apiUrl)
    if (!origin) return null

    const headers = buildAuthHeaders()
    const basePaths = [`${origin}/api/specimens`, `${origin}/api/v1/specimens`]

    for (const basePath of basePaths) {
      try {
        if (specimenId) {
          const detailRes = await fetch(`${basePath}/${specimenId}`, { headers })
          if (detailRes.ok) {
            const detailJson = await detailRes.json()
            if (detailJson?.success && detailJson?.data) {
              return detailJson.data
            }
          }
        }

        if (name) {
          const queryUrls = [
            `${basePath}?limit=200`,
            `${basePath}?category=Rock&limit=200`,
            `${basePath}?search=${encodeURIComponent(name)}`,
            basePath
          ]

          for (const url of queryUrls) {
            const listRes = await fetch(url, { headers })
            if (!listRes.ok) continue

            const listJson = await listRes.json()
            const rawData = listJson?.data ?? listJson
            const items = Array.isArray(rawData)
              ? rawData
              : (Array.isArray(rawData?.items) ? rawData.items : (Array.isArray(rawData?.specimens) ? rawData.specimens : []))

            if (!items.length) continue

            const target = String(name).trim().toLowerCase()
            const matched = items.find(item => {
              const n = String(item.name || '').trim().toLowerCase()
              const sci = String(item.scientific_name || '').trim().toLowerCase()
              return n === target || sci === target || n.includes(target) || sci.includes(target)
            })

            if (matched) {
              if (matched.id && (!matched.description || !matched.composition)) {
                const detailRes = await fetch(`${basePath}/${matched.id}`, { headers })
                if (detailRes.ok) {
                  const detailJson = await detailRes.json()
                  if (detailJson?.success && detailJson?.data) {
                    return detailJson.data
                  }
                }
              }
              return matched
            }
          }
        }
      } catch {
        // Intentar siguiente ruta si falla
      }
    }

    return null
  },

  async identifyRock(base64Image) {
    const apiUrl = process.env.GEODEX_API_URL
    if (!apiUrl) {
      throw new HttpError(500, 'El servicio de escaneo no está disponible en este momento.')
    }

    let jsonResponse
    let responseOk = false

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          image: { base64: base64Image, mime_type: 'image/jpeg' },
          top_k: 1
        })
      })
      responseOk = response.ok
      jsonResponse = await response.json()
    } catch {
      throw new HttpError(502, 'No fue posible conectar con el servicio de escaneo. Verifica tu conexión e inténtalo de nuevo.')
    }

    if (!responseOk || jsonResponse?.success === false) {
      throw new HttpError(422, 'No se pudo reconocer un espécimen válido en la imagen proporcionada.')
    }

    const topPrediction =
      jsonResponse.predictions?.[0] ||
      jsonResponse.data?.predictions?.[0]

    const bestMatch =
      jsonResponse.result ||
      topPrediction ||
      (jsonResponse.data && (jsonResponse.data.result || (jsonResponse.data.predictions && jsonResponse.data.predictions[0]) || jsonResponse.data))

    if (!bestMatch) {
      throw new HttpError(422, 'No se detectó ningún espécimen en la imagen. Intenta con una fotografía más clara.')
    }

    const rockName = bestMatch.scientific_name || bestMatch.name || bestMatch.label
    const rawConfidence = Number(bestMatch.confidence ?? bestMatch.probability ?? bestMatch.score ?? 85)
    const confidence = rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence)

    let catalog = bestMatch.catalog || bestMatch.specimen || topPrediction?.catalog || topPrediction?.specimen || bestMatch

    if (!catalog.description || (!catalog.rock_type && !catalog.mineral_type)) {
      const specimenData = await this.fetchSpecimenByNameOrId({
        name: rockName,
        specimenId: bestMatch.specimen_id || bestMatch.id || catalog?.id
      })
      if (specimenData) {
        catalog = { ...catalog, ...specimenData }
      }
    }

    const origin = getApiOrigin(apiUrl)
    if (catalog?.image_url && typeof catalog.image_url === 'string' && catalog.image_url.startsWith('/') && origin) {
      catalog.image_url = `${origin}${catalog.image_url}`
    }

    return {
      rockName: catalog.name || rockName,
      confidence,
      catalog
    }
  }
})

module.exports = { createAiService }