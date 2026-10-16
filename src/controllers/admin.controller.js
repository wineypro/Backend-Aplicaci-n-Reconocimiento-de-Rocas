const createAdminController = service => ({
  getStats: async (req, res, next) => {
    try { return res.json(await service.getStats()) } catch (error) { return next(error) }
  },
  getRecognitions: async (req, res, next) => {
    try { return res.json(await service.getRecognitions(req.query)) } catch (error) { return next(error) }
  },
  getFeedback: async (req, res, next) => {
    try { return res.json(await service.getFeedback(req.query)) } catch (error) { return next(error) }
  },
  updateUser: async (req, res, next) => {
    try { return res.json(await service.updateUser(req.user.id, req.params.id, req.body)) } catch (error) { return next(error) }
  },
  getUserCollection: async (req, res, next) => {
    try { return res.json(await service.getUserCollection(req.params.id)) } catch (error) { return next(error) }
  },
  getUserAchievements: async (req, res, next) => {
    try { return res.json(await service.getUserAchievements(req.params.id)) } catch (error) { return next(error) }
  }
})

module.exports = { createAdminController }