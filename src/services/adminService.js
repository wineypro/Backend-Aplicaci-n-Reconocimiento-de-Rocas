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
      include: [
        {
          model: models.Rock.unscoped(),
          as: 'rock',
          attributes: ['id', 'name'],
          required: true
        }
      ],
      order: [[models.sequelize.literal('count'), 'DESC']],
      limit: 5
    })

    const mostRecognizedRocks = topRocks.map(r => ({
      rockId: r.rockId,
      name: r.rock?.name || `Roca #${r.rockId}`,
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
        { model: models.Analysis, as: 'analysis', include: [{ model: models.Rock.unscoped(), as: 'rock', attributes: ['name'] }] }
      ]
    })
    return { items: result.rows, total: result.count, page: Number(query.page || 1), limit: options.limit }
  },

  async updateUser(adminId, targetUserId, updates = {}) {
    const targetId = Number(targetUserId)
    if (!Number.isInteger(targetId) || targetId < 1) {
      throw new HttpError(400, 'ID de usuario inválido')
    }

    const user = await models.User.findByPk(targetId)
    if (!user) throw new HttpError(404, 'Usuario no encontrado')

    const allowedUpdates = {}

    if (updates.status !== undefined) {
      if (adminId === targetId && updates.status !== user.status) {
        throw new HttpError(403, 'No puedes bloquear tu propia cuenta de administrador')
      }
      if (typeof updates.status !== 'string' || !VALID_STATUSES.includes(updates.status)) {
        throw new HttpError(400, 'Estado inválido; los valores permitidos son active o blocked')
      }
      allowedUpdates.status = updates.status
    }

    if (updates.roleId !== undefined) {
      const roleId = Number(updates.roleId)
      if (adminId === targetId && roleId !== user.roleId) {
        throw new HttpError(403, 'No puedes cambiar tu propio rol de administrador')
      }
      if (!Number.isInteger(roleId) || roleId < 1) {
        throw new HttpError(400, 'roleId debe ser un entero positivo')
      }
      const role = await models.Role.findByPk(roleId)
      if (!role) {
        throw new HttpError(400, 'El rol especificado no existe')
      }
      allowedUpdates.roleId = roleId
    }

    if (updates.userName !== undefined) {
      const cleanName = String(updates.userName).trim()
      if (!cleanName) throw new HttpError(400, 'El nombre de usuario no puede estar vacío')
      allowedUpdates.userName = cleanName
    }

    if (updates.email !== undefined) {
      const cleanEmail = String(updates.email).trim()
      if (!cleanEmail || !cleanEmail.includes('@')) throw new HttpError(400, 'El correo electrónico no es válido')
      allowedUpdates.email = cleanEmail
    }

    if (updates.phone !== undefined) {
      allowedUpdates.phone = updates.phone ? String(updates.phone).trim() : null
    }

    if (Object.keys(allowedUpdates).length === 0) {
      throw new HttpError(400, 'Debes especificar al menos un campo para actualizar')
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
      include: [{ model: models.Rock, as: 'rock', required: true }],
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
      order: [['unlockedAt', 'ASC']]
    })

    const achievementIds = result.rows.map(r => r.achievementId).filter(Boolean)
    const achievements = achievementIds.length
      ? await models.Achievement.findAll({ where: { id: achievementIds } })
      : []
    const achMap = new Map(achievements.map(a => [a.id, a]))

    const items = result.rows
      .map(row => ({
        ...row.toJSON(),
        achievement: achMap.get(row.achievementId) || null
      }))
      .filter(item => item.achievement !== null)

    return { items, total: items.length, page: Number(query.page || 1), limit: options.limit }
  }
})

module.exports = { createAdminService }