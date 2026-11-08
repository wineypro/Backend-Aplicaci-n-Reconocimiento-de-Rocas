const { Op } = require('sequelize')
const models = require('../models')
const { HttpError } = require('../utils/httpError')

const createAiRecognitionController = (recognitionService, aiService) => ({
  autoRecognize: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Debes adjuntar un archivo de imagen en el campo "image"' })
      }

      const base64Image = req.file.buffer.toString('base64')
      const aiResult = await aiService.identifyRock(base64Image)
      const catalogInfo = aiResult.catalog || {}

      const scientificName = catalogInfo.scientific_name || aiResult.rockName
      const commonName = catalogInfo.name || aiResult.rockName

      const localRock = await models.Rock.findOne({
        where: {
          [Op.or]: [
            { scientificName },
            { name: commonName }
          ]
        }
      })

      if (!localRock) {
        throw new HttpError(404, `La roca identificada (${scientificName}) no se encuentra registrada en el catálogo.`)
      }

      const result = await recognitionService.recognize(req.actor, {
        rockId: localRock.id,
        confidence: aiResult.confidence,
        imageUrl: req.file.originalname || 'imagen_subida.jpg'
      })

      return res.status(201).json(result)
    } catch (error) {
      return next(error)
    }
  }
})

module.exports = { createAiRecognitionController }