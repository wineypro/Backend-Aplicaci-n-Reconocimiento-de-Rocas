const { buildListOptions } = require('../utils/queryOptions')
const { HttpError } = require('../utils/httpError')

const VALID_STATUSES = ['active', 'blocked']

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

  async getRecognitions(query = {}) {
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

  async getFeedback(query = {}) {
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

  async updateUser(adminId, targetUserId, updates = {}) {
    const targetId = Number(targetUserId)
    if (!Number.isInteger(targetId) || targetId < 1) {
      throw new HttpError(400, 'ID de usuario inválido')
    }
    if (adminId === targetId) {
      throw new HttpError(403, 'No puedes bloquearte ni cambiar tu propio rol')
    }

    const user = await models.User.findByPk(targetId)
    if (!user) throw new HttpError(404, 'Usuario no encontrado')

    const allowedUpdates = {}

    if (updates.status !== undefined) {
      if (typeof updates.status !== 'string' || !VALID_STATUSES.includes(updates.status)) {
        throw new HttpError(400, 'Estado inválido; los valores permitidos son active o blocked')
      }
      allowedUpdates.status = updates.status
    }

    if (updates.roleId !== undefined) {
      const roleId = Number(updates.roleId)
      if (!Number.isInteger(roleId) || roleId < 1) {
        throw new HttpError(400, 'roleId debe ser un entero positivo')
      }
      const role = await models.Role.findByPk(roleId)
      if (!role) {
        throw new HttpError(400, 'El rol especificado no existe')
      }
      allowedUpdates.roleId = roleId
    }

    if (Object.keys(allowedUpdates).length === 0) {
      throw new HttpError(400, 'Debes especificar al menos status o roleId para actualizar')
    }

    await user.update(allowedUpdates)
    return user
  },

  async getUserCollection(targetUserId, query = {}) {
    const targetId = Number(targetUserId)
    const user = await models.User.findByPk(targetId)
    if (!user) throw new HttpError(404, 'Usuario no encontrado')

    const options = buildListOptions(query, [])
    options.where.userId = targetId

    const result = await models.Collection.findAndCountAll({
      ...options,
      include: [{ model: models.Rock, as: 'rock' }],
      order: [['firstDiscoveredAt', 'ASC']]
    })
    return { items: result.rows, total: result.count, page: Number(query.page || 1), limit: options.limit }
  },

  async getUserAchievements(targetUserId, query = {}) {
    const targetId = Number(targetUserId)
    const user = await models.User.findByPk(targetId)
    if (!user) throw new HttpError(404, 'Usuario no encontrado')

    const options = buildListOptions(query, [])
    options.where.userId = targetId

    const result = await models.UserAchievement.findAndCountAll({
      ...options,
      include: [{ model: models.Achievement, as: 'achievement' }],
      order: [['unlockedAt', 'ASC']]
    })
    return { items: result.rows, total: result.count, page: Number(query.page || 1), limit: options.limit }
  }
})

module.exports = { createAdminService }