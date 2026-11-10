const resolveOwner = req => req.actor || (req.user ? { kind: 'user', id: req.user.id } : null)

const createProgressController = service => ({
  getStats: async (req, res, next) => {
    try { return res.json(await service.getStats(resolveOwner(req))) }
    catch (error) { return next(error) }
  },
  getHistory: async (req, res, next) => {
    try { return res.json(await service.getHistory(resolveOwner(req), req.query)) }
    catch (error) { return next(error) }
  },
  getAchievements: async (req, res, next) => {
    try { return res.json(await service.getAchievements(resolveOwner(req))) }
    catch (error) { return next(error) }
  }
})

module.exports = { createProgressController }