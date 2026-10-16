const { Router } = require('express')
const validateToken = require('../middlewares/validateToken')
const { createResolveActor } = require('../middlewares/resolveActor')
const { adminOnly, authenticated } = require('../middlewares/guards')
const { guestSessions } = require('./recognition.route')

const models = require('../models')
const { createFeedbackService } = require('../services/feedbackService')
const { createFeedbackController } = require('../controllers/feedback.controller')
const { createProgressService } = require('../services/progressService')
const { createProgressController } = require('../controllers/progress.controller')
const { createMigrationService } = require('../services/migrationService')
const { createMigrationController } = require('../controllers/migration.controller')
const { createAdminService } = require('../services/adminService')
const { createAdminController } = require('../controllers/admin.controller')

const { createFusionService } = require('../services/fusionService')
const { createFusionController } = require('../controllers/fusion.controller')

const fusionController = createFusionController(createFusionService({ models }))

const feedbackController = createFeedbackController(createFeedbackService({ models }))
const progressController = createProgressController(createProgressService({ models }))
const migrationController = createMigrationController(createMigrationService({ models, sequelize: models.sequelize }))
const adminController = createAdminController(createAdminService({ models }))

const router = Router()
const userOrGuest = [validateToken.optional, createResolveActor(guestSessions)]

router.get('/progress/me', ...userOrGuest, progressController.getStats)
router.get('/progress/me/history', ...userOrGuest, progressController.getHistory)
router.get('/achievement/me', ...authenticated, progressController.getAchievements)

router.post('/recognition/:id/feedback', ...authenticated, feedbackController.create)
router.get('/recognition/:id/feedback', ...authenticated, feedbackController.get)
router.patch('/recognition/:id/feedback', ...authenticated, feedbackController.update)

router.post('/guest/migrate', ...authenticated, migrationController.migrate)

router.get('/admin/stats', ...adminOnly, adminController.getStats)
router.get('/admin/recognitions', ...adminOnly, adminController.getRecognitions)
router.get('/admin/feedback', ...adminOnly, adminController.getFeedback)
router.patch('/admin/users/:id', ...adminOnly, adminController.updateUser)
router.get('/admin/users/:id/collection', ...adminOnly, adminController.getUserCollection)
router.get('/admin/users/:id/achievements', ...adminOnly, adminController.getUserAchievements)

// --- Easter Egg: Alquimia ---
router.post('/collection/fusion', authenticated, fusionController.fuse)

module.exports = router