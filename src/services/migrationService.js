const { HttpError } = require('../utils/httpError')
const { hashToken } = require('./guestSessionService')

const createMigrationService = ({ models, sequelize }) => ({
  async migrateGuestData(userId, guestToken) {
    if (!guestToken) throw new HttpError(400, 'El token de invitado es obligatorio')

    const hashed = hashToken(guestToken)
    
    return sequelize.transaction(async transaction => {
      const session = await models.GuestSession.findOne({ 
        where: { tokenHash: hashed },
        transaction 
      })

      if (!session) throw new HttpError(404, 'Sesión de invitado no encontrada')
      if (session.status === 'transferred') throw new HttpError(409, 'La sesión ya ha sido transferida')

      // 1. Migrar Colección (Collection) - Resolver duplicados
      const guestCollections = await models.Collection.findAll({ where: { guestSessionId: session.id }, transaction })
      const userCollections = await models.Collection.findAll({ where: { userId }, transaction })
      const userColMap = new Map(userCollections.map(c => [c.rockId, c]))

      for (const gCol of guestCollections) {
        const uCol = userColMap.get(gCol.rockId)
        if (uCol) {
          // Fusionar contadores y conservar la fecha más antigua
          await uCol.update({
            recognitionCount: uCol.recognitionCount + gCol.recognitionCount,
            firstDiscoveredAt: new Date(Math.min(uCol.firstDiscoveredAt.getTime(), gCol.firstDiscoveredAt.getTime()))
          }, { transaction })
          await gCol.destroy({ transaction }) // Limpiar el duplicado de invitado
        } else {
          // Mover roca
          await gCol.update({ userId, guestSessionId: null }, { transaction })
        }
      }

      // 2. Migrar Logros (GuestAchievement a UserAchievement)
      const guestAchievements = await models.GuestAchievement.findAll({ where: { guestSessionId: session.id }, transaction })
      const userAchievements = await models.UserAchievement.findAll({ where: { userId }, transaction })
      const userAchSet = new Set(userAchievements.map(a => a.achievementId))

      for (const gAch of guestAchievements) {
        if (!userAchSet.has(gAch.achievementId)) {
          await models.UserAchievement.create({
            userId,
            achievementId: gAch.achievementId,
            unlockedAt: gAch.unlockedAt
          }, { transaction })
        }
      }

      // 3. Migrar el Historial de Análisis para no perder las estadísticas totales
      await models.Analysis.update(
        { userId, guestSessionId: null }, 
        { where: { guestSessionId: session.id }, transaction }
      )

      // 4. Invalidar la sesión de invitado
      await session.update({
        status: 'transferred',
        transferredToUserId: userId
      }, { transaction })

      return { message: 'Migración completada exitosamente' }
    })
  }
})

module.exports = { createMigrationService }