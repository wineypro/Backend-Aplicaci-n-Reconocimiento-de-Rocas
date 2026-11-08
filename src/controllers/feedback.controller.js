const createFeedbackController = service => ({
  create: async (req, res, next) => {
    try {
      const analysisId = Number(req.params.id)
      const { isCorrect, comment } = req.body || {}

      if (typeof isCorrect !== 'boolean') {
        return res.status(400).json({ message: 'El campo isCorrect es obligatorio y debe ser booleano (true o false)' })
      }
      if (comment !== undefined && comment !== null && (typeof comment !== 'string' || comment.length > 255)) {
        return res.status(400).json({ message: 'El comentario debe ser un texto de máximo 255 caracteres' })
      }

      const feedback = await service.createFeedback(req.user.id, analysisId, isCorrect, comment ?? null)
      return res.status(201).json(feedback)
    } catch (error) {
      return next(error)
    }
  },

  get: async (req, res, next) => {
    try {
      const analysisId = Number(req.params.id)
      const feedback = await service.getFeedback(req.user.id, analysisId)
      return res.json(feedback)
    } catch (error) {
      return next(error)
    }
  },

  update: async (req, res, next) => {
    try {
      const analysisId = Number(req.params.id)
      const { isCorrect, comment } = req.body || {}

      if (isCorrect !== undefined && typeof isCorrect !== 'boolean') {
        return res.status(400).json({ message: 'El campo isCorrect debe ser booleano (true o false)' })
      }
      if (comment !== undefined && comment !== null && (typeof comment !== 'string' || comment.length > 255)) {
        return res.status(400).json({ message: 'El comentario debe ser un texto de máximo 255 caracteres' })
      }

      const feedback = await service.updateFeedback(req.user.id, analysisId, req.body || {})
      return res.json(feedback)
    } catch (error) {
      return next(error)
    }
  }
})

module.exports = { createFeedbackController }