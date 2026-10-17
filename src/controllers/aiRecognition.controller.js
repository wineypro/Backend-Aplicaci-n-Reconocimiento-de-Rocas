const models = require('../models')
const { createGuestSessionService } = require('../services/guestSessionService')
const { createAchievementService } = require('../services/achievementService')
const { createRecognitionService } = require('../services/recognitionService')

const { Rock, Category, Type } = models

// Inicializamos aquí mismo el servicio con TODAS sus dependencias reales
const guestSessions = createGuestSessionService({ GuestSession: models.GuestSession })
const fullRecognitionService = createRecognitionService({
  models,
  sequelize: models.sequelize || Rock.sequelize,
  guestSessions,
  achievements: createAchievementService({ models })
})

const createAiRecognitionController = (_ignoredService, aiService) => ({
  autoRecognize: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Debes adjuntar un archivo de imagen en el campo "image"' })
      }

      const base64Image = req.file.buffer.toString('base64')
      const aiResult = await aiService.identifyRock(base64Image)
      const catalogInfo = aiResult.catalog || {}

      const [category] = await Category.findOrCreate({
        where: { name: catalogInfo.category || 'Rock' },
        defaults: { description: 'Categoría auto-registrada por IA' }
      })

      const [type] = await Type.findOrCreate({
        where: { name: catalogInfo.rock_type || 'Unknown' }
      })

      const scientificNameToSearch = catalogInfo.scientific_name || aiResult.rockName

      const [localRock] = await Rock.findOrCreate({
        where: { scientificName: scientificNameToSearch },
        defaults: {
          name: aiResult.rockName,
          categoryId: category.id,
          typeId: type.id,
          description: catalogInfo.description || 'Detectada automáticamente por IA.',
          index: catalogInfo.dex_number || Math.floor(Math.random() * 1000) + 100,
          composition: catalogInfo.composition || 'No especificada',
          formula: catalogInfo.formula || 'N/A',
          environment: catalogInfo.formation_environment || 'No especificado',
          commonUses: catalogInfo.common_uses || 'No especificado',
          hardness: catalogInfo.hardness || 'Variable',
          streak: catalogInfo.streak || 'No diagnóstica',
          color: catalogInfo.color || 'Variado',
          texture: catalogInfo.texture || 'No especificada',
          density: catalogInfo.density || 'Variable',
          transparency: catalogInfo.transparency || 'Opaco',
          tenacity: catalogInfo.tenacity || 'Quebradizo',
          imgUrl: catalogInfo.image_url || 'default.jpg',
          mindatUrl: 'https://www.mindat.org/'
        }
      })

      const actorId = req.user ? req.user.id : (req.guestSession ? req.guestSession.id : null)
      const actorKind = req.user ? 'user' : 'guest'
      const actor = req.actor || (actorId ? { kind: actorKind, id: actorId } : null)

      if (!actor) {
        return res.status(401).json({ error: 'Debes iniciar sesión o enviar un token de invitado.' })
      }

      // Usamos fullRecognitionService que ya tiene sequelize.transaction configurado
      const result = await fullRecognitionService.recognize(actor, {
        rockId: localRock.id,
        confidence: aiResult.confidence,
        imageUrl: 'imagen_subida_por_usuario.jpg'
      })

      return res.status(201).json(result)
    } catch (error) {
      return next(error)
    }
  }
})

module.exports = { createAiRecognitionController }