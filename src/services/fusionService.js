const { Op } = require('sequelize')
const { HttpError } = require('../utils/httpError')

const GEOLOGICAL_RECIPES = {
  'Basalt+Granite': { target: 'Slate', discoveredItem: 'Mármol Brillante', reason: '¡La presión y el calor han fusionado tu Basalto y tu Granito!' },
  'Basalt+Sandstone': { target: 'Slate', discoveredItem: 'Mármol Brillante', reason: 'El calor volcánico y la presión metamorfizaron la mezcla.' },
  'Granite+Sandstone': { target: 'Slate', discoveredItem: 'Pizarra Metamórfica', reason: 'La alta temperatura y presión transformaron los granos minerales.' }
}

const createFusionService = ({ models }) => ({
  async fuseRocks(userId, rockId1, rockId2) {
    if (Number(rockId1) === Number(rockId2)) {
      throw new HttpError(400, 'Debes elegir dos rocas distintas para realizar una fusión.')
    }

    const ownedRock1 = await models.Collection.findOne({ where: { userId, rockId: rockId1 } })
    const ownedRock2 = await models.Collection.findOne({ where: { userId, rockId: rockId2 } })

    if (!ownedRock1 || !ownedRock2) {
      throw new HttpError(400, 'Necesitas tener ambas rocas en tu colección para intentar fusionarlas.')
    }

    const rock1 = await models.Rock.findByPk(rockId1)
    const rock2 = await models.Rock.findByPk(rockId2)

    if (!rock1 || !rock2) {
      throw new HttpError(404, 'Una de las rocas seleccionadas no existe en el catálogo.')
    }

    const key = [rock1.scientificName, rock2.scientificName].sort().join('+')
    const recipe = GEOLOGICAL_RECIPES[key]

    const targetRock = await models.Rock.findOne({
      where: recipe
        ? { [Op.or]: [{ scientificName: recipe.target }, { name: recipe.target }] }
        : { id: { [Op.notIn]: [rock1.id, rock2.id] } }
    }) || rock1

    let collectionEntry = await models.Collection.findOne({
      where: { userId, rockId: targetRock.id }
    })
    const newDiscovery = !collectionEntry

    if (collectionEntry) {
      await collectionEntry.update({ recognitionCount: collectionEntry.recognitionCount + 1 })
    } else {
      collectionEntry = await models.Collection.create({
        userId,
        rockId: targetRock.id,
        firstDiscoveredAt: new Date(),
        recognitionCount: 1
      })
    }

    return {
      success: true,
      message: recipe ? recipe.reason : `¡La presión y temperatura entre ${rock1.name} y ${rock2.name} produjeron ${targetRock.name}!`,
      discoveredItem: recipe ? recipe.discoveredItem : targetRock.name,
      newDiscovery,
      rock: targetRock,
      collection: {
        rockId: collectionEntry.rockId,
        recognitionCount: collectionEntry.recognitionCount,
        firstDiscoveredAt: collectionEntry.firstDiscoveredAt
      }
    }
  }
})

module.exports = { createFusionService }