const { HttpError } = require('../utils/httpError')

const validateFeedbackInput = ({ isCorrect, comment }, requireIsCorrect = false) => {
  if (requireIsCorrect || isCorrect !== undefined) {
    if (typeof isCorrect !== 'boolean') {
      throw new HttpError(400, 'El campo isCorrect es obligatorio y debe ser booleano')
    }
  }
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== 'string' || comment.length > 255) {
      throw new HttpError(400, 'El comentario debe ser un texto de máximo 255 caracteres')
    }
  }
}

const createFeedbackService = ({ models }) => ({
  async createFeedback(userId, analysisId, isCorrect, comment) {
    if (!Number.isInteger(analysisId) || analysisId < 1) {
      throw new HttpError(400, 'ID de reconocimiento inválido')
    }
    validateFeedbackInput({ isCorrect, comment }, true)

    const analysis = await models.Analysis.findByPk(analysisId)
    // 404 uniforme si no existe o pertenece a otro usuario
    if (!analysis || analysis.userId !== userId) {
      throw new HttpError(404, 'Reconocimiento no encontrado')
    }

    const existingFeedback = await models.Feedback.findOne({ where: { analysisId } })
    if (existingFeedback) {
      throw new HttpError(409, 'Ya has enviado retroalimentación para este reconocimiento')
    }

    return models.Feedback.create({ userId, analysisId, isCorrect, comment: comment ?? null })
  },

  async getFeedback(userId, analysisId) {
    if (!Number.isInteger(analysisId) || analysisId < 1) {
      throw new HttpError(400, 'ID de reconocimiento inválido')
    }

    const feedback = await models.Feedback.findOne({ where: { analysisId } })
    if (!feedback || feedback.userId !== userId) {
      throw new HttpError(404, 'Retroalimentación no encontrada')
    }

    return feedback
  },

  async updateFeedback(userId, analysisId, updates = {}) {
    if (!Number.isInteger(analysisId) || analysisId < 1) {
      throw new HttpError(400, 'ID de reconocimiento inválido')
    }
    validateFeedbackInput(updates, false)

    const feedback = await models.Feedback.findOne({ where: { analysisId } })
    if (!feedback || feedback.userId !== userId) {
      throw new HttpError(404, 'Retroalimentación no encontrada')
    }

    const allowedUpdates = {}
    if (updates.isCorrect !== undefined) allowedUpdates.isCorrect = updates.isCorrect
    if (updates.comment !== undefined) allowedUpdates.comment = updates.comment

    await feedback.update(allowedUpdates)
    return feedback
  }
})

module.exports = { createFeedbackService }