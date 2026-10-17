const { Router } = require('express')
const models = require('../models')
const validateToken = require('../middlewares/validateToken')
const { createResolveActor } = require('../middlewares/resolveActor')
const { createGuestSessionService } = require('../services/guestSessionService')
const { createAchievementService } = require('../services/achievementService')
const { createRecognitionService } = require('../services/recognitionService')
const { createRecognitionController } = require('../controllers/recognition.controller')

const guestSessions = createGuestSessionService({ GuestSession: models.GuestSession })
const service = createRecognitionService({ models, sequelize: models.sequelize, guestSessions, achievements: createAchievementService({ models }) })
const controller = createRecognitionController(service)

const router = Router()
router.post('/', validateToken.optional, createResolveActor(guestSessions), controller.create)
module.exports = router
module.exports.guestSessions = guestSessions