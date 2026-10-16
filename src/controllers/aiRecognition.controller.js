const createAiRecognitionController = (recognitionService, aiService) => ({
  autoRecognize: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Debes adjuntar un archivo de imagen en el campo "image"' })
      }

      const base64Image = req.file.buffer.toString('base64')
      const aiResult = await aiService.identifyRock(base64Image)

      const result = await recognitionService.processRecognition(req.user, {
        rockId: aiResult.rockId,
        confidence: aiResult.confidence,
        imageUrl: "imagen_subida_por_usuario.jpg" 
      })

      return res.status(201).json(result)
    } catch (error) {
      return next(error)
    }
  }
})

module.exports = { createAiRecognitionController }