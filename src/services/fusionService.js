const { HttpError } = require('../utils/httpError')

const createFusionService = ({ models }) => ({
  async fuseRocks(userId, rockId1, rockId2) {
    const rock1 = await models.Collection.findOne({ where: { userId, rockId: rockId1 } })
    const rock2 = await models.Collection.findOne({ where: { userId, rockId: rockId2 } })

    if (!rock1 || !rock2) {
      throw new HttpError(400, 'Necesitas tener ambas rocas en tu colección para intentar fusionarlas.')
    }

    const recipeKey = [Number(rockId1), Number(rockId2)].sort().join('-')

    const recipes = {
      '1-2': { result: 'Mármol Brillante', message: '¡La presión y el calor han fusionado tu Caliza y tu Basalto!' },
      '3-4': { result: 'Obsidiana Pura', message: '¡Has cristalizado la mezcla rápidamente!' },
      '1-5': { result: 'Gólem de Piedra', message: '¡Magia antigua! Las rocas han cobrado vida.' }
    }

    const fusion = recipes[recipeKey]

    if (fusion) {
      return { success: true, message: fusion.message, discoveredItem: fusion.result }
    } else {
      return { success: false, message: 'Estas dos rocas no reaccionan entre sí. Solo obtuviste un poco de polvo.' }
    }
  }
})

module.exports = { createFusionService }