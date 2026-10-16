const createFeedbackController = service => ({
  create: async (req, res, next) => {
    try {
      const analysisId = Number(req.params.id)
      const { isCorrect, comment } = req.body
      
      if (isCorrect === undefined) {
          return res.status(400).json({ message: 'El campo isCorrect es obligatorio' })
      }
      
      const feedback = await service.createFeedback(req.user.id, analysisId, isCorrect, comment)
      return res.status(201).json(feedback)
    } catch (error) { return next(error) }
  },

  get: async (req, res, next) => {
    try {
      const analysisId = Number(req.params.id)
      const feedback = await service.getFeedback(req.user.id, analysisId)
      return res.json(feedback)
    } catch (error) { return next(error) }
  },

  update: async (req, res, next) => {
    try {
      const analysisId = Number(req.params.id)
      const feedback = await service.updateFeedback(req.user.id, analysisId, req.body)
      return res.json(feedback)
    } catch (error) { return next(error) }
  }
})

module.exports = { createFeedbackController }