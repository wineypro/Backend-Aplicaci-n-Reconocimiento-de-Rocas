const { Router } = require('express')
const models = require('../models')
const createCrudRouter = require('./crud.route')
const { buildListOptions } = require('../utils/queryOptions')
const { adminOnly } = require('../middlewares/guards')
const { createRockService } = require('../services/rockService')
const { createRockController } = require('../controllers/rock.controller')
const router = Router()
const rockController = createRockController(createRockService({ Rock: models.Rock }))

// Usamos el primer middleware de adminOnly (que autentica el token y llena req.user)
const authMiddleware = Array.isArray(adminOnly) ? adminOnly[0] : adminOnly

const teacherOrAdmin = [
  authMiddleware,
  (req, res, next) => {
    const roleName = String(req.user?.role?.name || '').toLowerCase()
    const roleId = Number(req.user?.roleId)
    if (roleName === 'admin' || roleName === 'teacher' || roleName === 'maestro' || roleId === 2 || roleId === 3) {
      return next()
    }
    return res.status(403).json({ message: 'Se requiere rol de Maestro o Administrador para editar fichas geológicas.' })
  }
]

// Demostración educativa: búsqueda textual sobre campos observables; no ejecuta reconocimiento por imagen.
router.get('/identificar', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim()
    if (!query) return res.status(400).json({ message: 'El parámetro q es obligatorio' })
    const options = buildListOptions(
      { search: query },
      ['name', 'scientificName', 'composition', 'formula', 'environment', 'commonUses', 'color', 'streak', 'texture']
    )
    options.include = ['type', 'category']
    const result = await models.Rock.findAndCountAll(options)
    return res.json({ query, method: 'text-match', total: result.count, rocks: result.rows, items: result.rows })
  } catch (error) { return next(error) }
})

// Specific routes must be declared before the generic CRUD routes, otherwise `/dureza` would match `/:id`.
router.get('/dureza', rockController.byHardness)

const rockFields = ['index', 'name', 'scientificName', 'description', 'composition', 'formula', 'molarWeight', 'environment', 'commonUses', 'hardness', 'streak', 'color', 'texture', 'density', 'transparency', 'tenacity', 'imgUrl', 'mindatUrl', 'typeId', 'categoryId']

// Permitir a Maestros y Administradores editar la información de una roca existente
router.patch('/:id', ...teacherOrAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'ID inválido' })
    const rock = await models.Rock.findByPk(id)
    if (!rock) return res.status(404).json({ message: 'Roca no encontrada' })

    const updates = {}
    for (const field of rockFields) {
      if (req.body[field] !== undefined && field !== 'index') {
        updates[field] = req.body[field]
      }
    }
    await rock.update(updates)
    const updated = await models.Rock.findByPk(id)
    return res.json(updated)
  } catch (error) {
    return next(error)
  }
})

// Autocalcular `index` si no se envía al crear una roca en Admin
router.post('/', ...(Array.isArray(adminOnly) ? adminOnly : [adminOnly]), async (req, res, next) => {
  try {
    if (req.body.scientificName) {
      const sci = String(req.body.scientificName).trim()
      const existingActive = await models.Rock.findOne({ where: { scientificName: sci } })
      if (existingActive) {
        return res.status(400).json({ message: 'Ya existe una roca registrada con ese nombre científico.' })
      }
      const existingDeleted = await models.Rock.unscoped().findOne({ where: { scientificName: sci }, paranoid: false })
      if (existingDeleted && existingDeleted.deletedAt) {
        await existingDeleted.update({ scientificName: `${sci}_deleted_${existingDeleted.id}` }, { paranoid: false })
      }
    }

    if (req.body.index === undefined || req.body.index === null || req.body.index === '') {
      const allRocks = await models.Rock.unscoped().findAll({
        attributes: ['index'],
        paranoid: false
      })
      const used = new Set(allRocks.map(r => Number(r.index)).filter(Number.isFinite))
      let nextIndex = 1
      while (used.has(nextIndex)) nextIndex += 1
      req.body.index = nextIndex
    }
    return next()
  } catch (error) {
    return next(error)
  }
})

router.use('/', createCrudRouter(models.Rock, {
  name: 'Roca',
  searchableFields: ['name', 'scientificName', 'composition', 'formula', 'environment', 'commonUses', 'hardness', 'streak', 'color', 'texture'],
  allowedFields: rockFields,
  filterFields: ['typeId', 'categoryId'],
  writeMiddlewares: adminOnly
}))

module.exports = router