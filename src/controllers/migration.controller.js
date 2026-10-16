const createMigrationController = service => ({
  migrate: async (req, res, next) => {
    try {
      const guestToken = req.header('X-Guest-Token')
      const result = await service.migrateGuestData(req.user.id, guestToken)
      return res.json(result)
    } catch (error) { return next(error) }
  }
})

module.exports = { createMigrationController }