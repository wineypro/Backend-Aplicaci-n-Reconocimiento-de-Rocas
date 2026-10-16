const { Op } = require('sequelize')
const { buildListOptions } = require('../utils/queryOptions')
const { HttpError } = require('../utils/httpError')

const createAdminService = ({ models }) => ({
  async getStats() {
    const registeredUsers = await models.User.count()
    const totalRecognitions = await models.Analysis.count()

    const topRocks = await models.Analysis.findAll({
      attributes: [
        'rockId',
        [models.sequelize.fn('COUNT', models.sequelize.col('Analysis.id')), 'count']
      ],
      group: ['rockId', 'rock.id', 'rock.name'],
      include: [{ model: models.Rock, as: 'rock', attributes: ['name'] }],
      order: [[models.sequelize.literal('count'), 'DESC']],
      limit: 5
    })

    const mostRecognizedRocks = topRocks.map(r => ({
      rockId: r.rockId,
      name: r.rock.name,
      count: Number(r.get('count'))
    }))

    return { registeredUsers, totalRecognitions, mostRecognizedRocks }
  },

  async getRecognitions(query) {
    const options = buildListOptions(query, [])
    if (query.userId) options.where.userId = Number(query.userId)
    if (query.rockId) options.where.rockId = Number(query.rockId)

    const result = await models.Analysis.findAndCountAll({
      ...options,
      order: [['createdAt', 'DESC']],
      include: [
        { model: models.Rock, as: 'rock' },
        { model: models.User, as: 'user', attributes: ['id', 'userName', 'email'] }
      ]
    })
    return { items: result.rows, total: result.count, page: Number(query.page || 1), limit: options.limit }
  },

  async getFeedback(query) {
    const options = buildListOptions(query, [])
    const result = await models.Feedback.findAndCountAll({
      ...options,
      order: [['createdAt', 'DESC']],
      include: [
        { model: models.User, as: 'user', attributes: ['id', 'userName'] },
        { model: models.Analysis, as: 'analysis', include: [{ model: models.Rock, as: 'rock', attributes: ['name'] }] }
      ]
    })
    return { items: result.rows, total: result.count, page: Number(query.page || 1), limit: options.limit }
  },

  async updateUser(adminId, targetUserId, updates) {
    if (adminId === Number(targetUserId)) {
      throw new HttpError(403, 'No puedes bloquearte ni cambiar tu propio rol')
    }
    
    const user = await models.User.findByPk(targetUserId)
    if (!user) throw new HttpError(404, 'Usuario no encontrado')

    const allowedUpdates = {}
    if (updates.roleId) allowedUpdates.roleId = Number(updates.roleId)
    if (updates.status && ['active', 'blocked'].includes(updates.status)) {
      allowedUpdates.status = updates.status
    }

    await user.update(allowedUpdates)
    return user
  },

  async getUserCollection(targetUserId) {
    const user = await models.User.findByPk(targetUserId)
    if (!user) throw new HttpError(404, 'Usuario no encontrado')

    const items = await models.Collection.findAll({
      where: { userId: targetUserId },
      include: [{ model: models.Rock, as: 'rock' }],
      order: [['firstDiscoveredAt', 'ASC']]
    })
    return { items, total: items.length }
  },

  async getUserAchievements(targetUserId) {
    const user = await models.User.findByPk(targetUserId)
    if (!user) throw new HttpError(404, 'Usuario no encontrado')

    const unlocked = await models.UserAchievement.findAll({
      where: { userId: targetUserId },
      include: [{ model: models.Achievement, as: 'achievement' }],
      order: [['unlockedAt', 'ASC']]
    })
    return { items: unlocked, total: unlocked.length }
  }
})

module.exports = { createAdminService }