const models = require('../models')
const { createGuestSessionService } = require('../services/guestSessionService')
const { createAchievementService } = require('../services/achievementService')
const { createRecognitionService } = require('../services/recognitionService')
const { Op } = require('sequelize')

const { Rock, Category, Type } = models

const guestSessions = createGuestSessionService({ GuestSession: models.GuestSession })
const fullRecognitionService = createRecognitionService({
  models,
  sequelize: models.sequelize || Rock.sequelize,
  guestSessions,
  achievements: createAchievementService({ models })
})

const TYPE_MAP = {
  Igneous: 'Ignea',
  Sedimentary: 'Sedimentaria',
  Metamorphic: 'Metamorfica'
}

// Convierte el texto de dureza de la API (ej. "Variable, commonly hard" o "6.5") en un entero 1-10 para cumplir la validación de rock.js
const parseHardnessInt = (rawHardness) => {
  if (typeof rawHardness === 'number' && Number.isFinite(rawHardness)) {
    return Math.min(10, Math.max(1, Math.round(rawHardness)))
  }
  if (typeof rawHardness === 'string') {
    const matches = rawHardness.match(/\d+(\.\d+)?/g)
    if (matches && matches.length > 0) {
      const avg = matches.reduce((acc, v) => acc + Number(v), 0) / matches.length
      return Math.min(10, Math.max(1, Math.round(avg)))
    }
    const lower = rawHardness.toLowerCase()
    if (lower.includes('soft')) return 3
    if (lower.includes('medium')) return 5
    if (lower.includes('hard')) return 6
  }
  return 6
}

// Extrae el valor numérico de densidad de la API (ej. "About 2.6-2.8 g/cm3" -> 2.7)
const parseDensityNumber = (rawDensity) => {
  if (typeof rawDensity === 'number' && Number.isFinite(rawDensity)) return rawDensity
  if (typeof rawDensity === 'string') {
    const matches = rawDensity.match(/\d+(\.\d+)?/g)
    if (matches && matches.length >= 2) {
      return Number(((Number(matches[0]) + Number(matches[1])) / 2).toFixed(2))
    }
    if (matches && matches.length === 1) {
      return Number(matches[0])
    }
  }
  return 2.7
}

const getSafeUniqueIndex = async (preferredIndex) => {
  const candidate = Number(preferredIndex)
  if (Number.isInteger(candidate) && candidate > 0) {
    const existing = await Rock.unscoped().findOne({ where: { index: candidate }, paranoid: false })
    if (!existing) return candidate
  }
  const allRocks = await Rock.unscoped().findAll({ attributes: ['index'], paranoid: false })
  const used = new Set(allRocks.map(r => Number(r.index)).filter(Number.isFinite))
  let nextIdx = 10
  while (used.has(nextIdx)) nextIdx += 1
  return nextIdx
}

const createAiRecognitionController = (_ignoredService, aiService) => ({
  autoRecognize: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Por favor selecciona o captura una fotografía para escanear.' })
      }

      const base64Image = req.file.buffer.toString('base64')
      const mimeType = req.file.mimetype || 'image/jpeg'
      const uploadedDataUrl = `data:${mimeType};base64,${base64Image}`

      const aiResult = await aiService.identifyRock(base64Image)
      const catalogInfo = aiResult.catalog || {}

      const apiRockType = catalogInfo.rock_type || catalogInfo.mineral_type || catalogInfo.category || 'Rock'
      const mappedTypeName = TYPE_MAP[apiRockType] || apiRockType
      const mappedCatName = catalogInfo.category || 'Rock'

      const [category] = await Category.findOrCreate({
        where: { name: mappedCatName },
        defaults: { description: 'GeoDex API Category' }
      })

      const [type] = await Type.findOrCreate({
        where: { name: mappedTypeName }
      })

      const scientificName = String(catalogInfo.scientific_name || aiResult.rockName || '').trim()
      const displayName = String(catalogInfo.name || scientificName).trim()

      // Liberar scientificName si pertenecía a una roca eliminada anteriormente (paranoid)
      const deletedConflict = await Rock.unscoped().findOne({
        where: { scientificName: { [Op.in]: [scientificName, displayName] } },
        paranoid: false
      })
      if (deletedConflict && deletedConflict.deletedAt) {
        await deletedConflict.update(
          { scientificName: `${deletedConflict.scientificName}_del_${deletedConflict.id}_${Date.now()}` },
          { paranoid: false }
        )
      }

      let localRock = await Rock.findOne({
        where: {
          [Op.or]: [
            { scientificName: { [Op.in]: [scientificName, displayName] } },
            { name: { [Op.in]: [scientificName, displayName] } }
          ]
        }
      })

      // Usar directamente los campos entregados por la API de GeoDex (rocas-api.md)
      const apiPayload = {
        name: displayName,
        scientificName: localRock ? localRock.scientificName : scientificName,
        categoryId: category.id,
        typeId: type.id,
        description: catalogInfo.description || 'Specimen identified via GeoDex scanner.',
        composition: catalogInfo.composition || 'Mineral composition as per specimen.',
        formula: catalogInfo.formula ?? 'Not applicable (rock)',
        environment: catalogInfo.formation_environment || 'Earth crust',
        commonUses: catalogInfo.common_uses || 'Geological study and construction',
        hardness: parseHardnessInt(catalogInfo.hardness),
        streak: catalogInfo.streak || 'Not diagnostic',
        color: catalogInfo.color || 'Characteristic of specimen',
        texture: catalogInfo.texture || 'Crystalline / Granular',
        density: parseDensityNumber(catalogInfo.density),
        transparency: 0,
        tenacity: 1,
        mindatUrl: 'https://www.mindat.org/'
      }

      if (!localRock) {
        const uniqueIndex = await getSafeUniqueIndex(catalogInfo.dex_number || catalogInfo.id)
        localRock = await Rock.create({
          ...apiPayload,
          index: uniqueIndex,
          imgUrl: uploadedDataUrl || catalogInfo.image_url || 'default.jpg'
        })
      } else {
        // Si ya tenía una foto real en imgUrl, la conservamos para no sobrescribirla; la nueva foto se guarda en Analysis
        const hasValidExistingPhoto =
          typeof localRock.imgUrl === 'string' &&
          (localRock.imgUrl.startsWith('data:image/') ||
            (localRock.imgUrl.startsWith('http') &&
              !localRock.imgUrl.includes('via.placeholder.com') &&
              !localRock.imgUrl.includes('example.')))

        await localRock.update({
          ...apiPayload,
          index: localRock.index,
          imgUrl: hasValidExistingPhoto ? localRock.imgUrl : (uploadedDataUrl || catalogInfo.image_url || localRock.imgUrl)
        })
      }

      const actorId = req.user ? req.user.id : (req.guestSession ? req.guestSession.id : null)
      const actorKind = req.user ? 'user' : 'guest'
      const actor = req.actor || (actorId ? { kind: actorKind, id: actorId } : null)

      if (!actor) {
        return res.status(401).json({ message: 'Tu sesión ha expirado. Inicia sesión nuevamente.' })
      }

      // Guardar la foto completa en Base64 dentro de Analysis para acumular todas las muestras fotografiadas
      const result = await fullRecognitionService.recognize(actor, {
        rockId: localRock.id,
        confidence: aiResult.confidence,
        imageUrl: uploadedDataUrl,
        note: 'Escaneo registrado'
      })

      const fullRock = await Rock.findByPk(localRock.id)

      return res.status(201).json({
        ...result,
        rock: fullRock || localRock
      })
    } catch (error) {
      return next(error)
    }
  }
})

module.exports = { createAiRecognitionController }