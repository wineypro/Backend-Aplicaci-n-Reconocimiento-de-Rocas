const createProgressController = service => ({
  getStats: async (req, res, next) => {
    try { return res.json(await service.getStats(req.actor)) } 
    catch (error) { return next(error) }
  },
  getHistory: async (req, res, next) => {
    try { return res.json(await service.getHistory(req.actor, req.query)) } 
    catch (error) { return next(error) }
  },
  getAchievements: async (req, res, next) => {
    try { return res.json(await service.getAchievements(req.actor)) } 
    catch (error) { return next(error) }
  }
})

module.exports = { createProgressController }