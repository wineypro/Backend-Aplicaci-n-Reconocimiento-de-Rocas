const { buildListOptions } = require('../utils/queryOptions')

const getRank = (rocksCount) => {
  if (rocksCount === 0) return 'Piedra Rodante'
  if (rocksCount < 3) return 'Explorador de Grava'
  if (rocksCount < 6) return 'Buscador de Cuarzo'
  if (rocksCount < 10) return 'Cazador de Geodas'
  return 'Maestro Geólogo'
}

const createProgressService = ({ models }) => {
  const getOwnerWhere = (actor) => actor.kind === 'user' ? { userId: actor.id } : { guestSessionId: actor.id }
  const getUnlockModel = (actor) => actor.kind === 'user' ? models.UserAchievement : models.GuestAchievement

  return {
    async getStats(actor) {
      const where = getOwnerWhere(actor)
      const UnlockModel = getUnlockModel(actor)

      const totalCatalogRocks = await models.Rock.count()
      const distinctRocks = await models.Collection.count({ where })
      const totalRecognitions = await models.Analysis.count({ where })
      const unlockedAchievements = await UnlockModel.count({ where })

      const discoveryPercentage = totalCatalogRocks === 0 
        ? 0 
        : Math.round((distinctRocks / totalCatalogRocks) * 1000) / 10

      const rank = getRank(distinctRocks)

      return { totalRecognitions, distinctRocks, unlockedAchievements, discoveryPercentage, rank }
    },

    async getHistory(actor, query) {
      const where = getOwnerWhere(actor)
      const options = buildListOptions(query, [])
      
      const { count, rows } = await models.Analysis.findAndCountAll({
        where: { ...options.where, ...where },
        limit: options.limit,
        offset: options.offset,
        order: [['createdAt', 'DESC']],
        include: [{ model: models.Rock, as: 'rock' }]
      })

      return { items: rows, total: count, page: Number(query.page || 1), limit: options.limit }
    },

    async getAchievements(actor) {
      const where = getOwnerWhere(actor)
      const UnlockModel = getUnlockModel(actor)

      const activeAchievements = await models.Achievement.findAll({
        where: { isActive: true },
        order: [['experience', 'ASC'], ['id', 'ASC']]
      })

      const unlockedRecords = await UnlockModel.findAll({ where })
      const unlockedMap = new Map(unlockedRecords.map(u => [u.achievementId, u.unlockedAt]))

      return activeAchievements.map(ach => ({
        ...ach.toJSON(),
        unlocked: unlockedMap.has(ach.id),
        unlockedAt: unlockedMap.get(ach.id) || null
      }))
    }
  }
}

module.exports = { createProgressService }