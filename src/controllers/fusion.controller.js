const createFusionController = service => ({
  fuse: async (req, res, next) => {
    try {
      const { rockId1, rockId2 } = req.body
      if (!rockId1 || !rockId2) {
        return res.status(400).json({ error: 'Debes enviar rockId1 y rockId2 en el body' })
      }
      const result = await service.fuseRocks(req.user.id, rockId1, rockId2)
      return res.json(result)
    } catch (error) {
      return next(error)
    }
  }
})

module.exports = { createFusionController }