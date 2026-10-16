const { HttpError } = require('../utils/httpError')

const createFeedbackService = ({ models }) => ({
  async createFeedback(userId, analysisId, isCorrect, comment) {
    const analysis = await models.Analysis.findByPk(analysisId)
    if (!analysis) throw new HttpError(404, 'Reconocimiento no encontrado')
    if (analysis.userId !== userId) throw new HttpError(403, 'No puedes evaluar un reconocimiento que no es tuyo')

    const existingFeedback = await models.Feedback.findOne({ where: { analysisId } })
    if (existingFeedback) throw new HttpError(409, 'Ya has enviado retroalimentación para este reconocimiento')

    return models.Feedback.create({ userId, analysisId, isCorrect, comment })
  },

  async getFeedback(userId, analysisId) {
    const feedback = await models.Feedback.findOne({ where: { analysisId } })
    if (!feedback) throw new HttpError(404, 'Retroalimentación no encontrada')
    if (feedback.userId !== userId) throw new HttpError(403, 'No puedes leer retroalimentación que no es tuya')
    
    return feedback
  },

  async updateFeedback(userId, analysisId, updates) {
    const feedback = await models.Feedback.findOne({ where: { analysisId } })
    if (!feedback) throw new HttpError(404, 'Retroalimentación no encontrada')
    if (feedback.userId !== userId) throw new HttpError(403, 'No puedes editar retroalimentación que no es tuya')

    const allowedUpdates = {}
    if (updates.isCorrect !== undefined) allowedUpdates.isCorrect = updates.isCorrect
    if (updates.comment !== undefined) allowedUpdates.comment = updates.comment

    await feedback.update(allowedUpdates)
    return feedback
  }
})

module.exports = { createFeedbackService }