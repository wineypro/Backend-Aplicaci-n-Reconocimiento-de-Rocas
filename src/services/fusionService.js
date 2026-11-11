const { Op } = require('sequelize')
const { HttpError } = require('../utils/httpError')

const RECIPES = [
  {
    ingredientes: ['Basalto', 'Granito'],
    resultado: {
      name: 'Obsidiana',
      scientificName: 'Obsidian',
      type: 'Ignea',
      category: 'Volcanica',
      hardness: 5,
      color: 'Negro brillante',
      index: 901
    }
  },
  {
    ingredientes: ['Arenisca', 'Basalto'],
    resultado: {
      name: 'Cuarcita',
      scientificName: 'Quartzite',
      type: 'Metamorfica',
      category: 'No Foliada',
      hardness: 7,
      color: 'Blanco o grisáceo',
      index: 902
    }
  },
  {
    ingredientes: ['Pizarra', 'Granito'],
    resultado: {
      name: 'Gneis',
      scientificName: 'Gneiss',
      type: 'Metamorfica',
      category: 'Foliada',
      hardness: 6,
      color: 'Bandeado',
      index: 903
    }
  },
  {
    ingredientes: ['Arenisca', 'Pizarra'],
    resultado: {
      name: 'Conglomerado',
      scientificName: 'Conglomerate',
      type: 'Sedimentaria',
      category: 'Clastica',
      hardness: 4,
      color: 'Gris moteado',
      index: 904
    }
  },
  {
    ingredientes: ['Arenisca', 'Granito'],
    resultado: {
      name: 'Mármol',
      scientificName: 'Marble',
      type: 'Metamorfica',
      category: 'No Foliada',
      hardness: 3,
      color: 'Blanco veteado',
      index: 905
    }
  },
  {
    ingredientes: ['Basalto', 'Pizarra'],
    resultado: {
      name: 'Andesita',
      scientificName: 'Andesite',
      type: 'Ignea',
      category: 'Volcanica',
      hardness: 6,
      color: 'Gris oscuro',
      index: 906
    }
  }
]

const FUSION_LOCKED_DESC =
  'Esta roca la descubriste por fusión. ¡Encuéntrala y tómale una foto en el escáner para desbloquear su información geológica!'

const createFusionService = ({ models }) => ({
  async fuseRocks(userId, rockId1, rockId2) {
    if (Number(rockId1) === Number(rockId2)) {
      throw new HttpError(400, 'Debes elegir dos rocas distintas para fusionarlas.')
    }

    const [owned1, owned2] = await Promise.all([
      models.Collection.findOne({ where: { userId, rockId: rockId1 } }),
      models.Collection.findOne({ where: { userId, rockId: rockId2 } })
    ])

    if (!owned1 || !owned2) {
      throw new HttpError(400, 'Necesitas tener ambas rocas en tu colección para fusionarlas.')
    }

    const rock1 = await models.Rock.findByPk(rockId1)
    const rock2 = await models.Rock.findByPk(rockId2)

    if (!rock1 || !rock2) throw new HttpError(404, 'Una de las rocas seleccionadas no existe.')

    const ingNames = [rock1.name, rock2.name]

    const recipe = RECIPES.find(
      r => r.ingredientes.includes(ingNames[0]) && r.ingredientes.includes(ingNames[1])
    )

    let targetRock

    if (recipe) {
      const [type] = await models.Type.findOrCreate({ where: { name: recipe.resultado.type } })
      const [category] = await models.Category.findOrCreate({
        where: { name: recipe.resultado.category },
        defaults: { description: 'Categoría geológica obtenida por fusión' }
      })

      let fused = await models.Rock.findOne({
        where: {
          [Op.or]: [
            { scientificName: recipe.resultado.scientificName },
            { name: recipe.resultado.name }
          ]
        }
      })

      if (!fused) {
        const existingIdx = await models.Rock.findOne({
          where: { index: recipe.resultado.index },
          paranoid: false
        })
        const safeIndex = existingIdx
          ? Math.floor(Math.random() * 500) + 1000
          : recipe.resultado.index

        fused = await models.Rock.create({
          name: recipe.resultado.name,
          scientificName: recipe.resultado.scientificName,
          index: safeIndex,
          description: FUSION_LOCKED_DESC,
          hardness: Number(recipe.resultado.hardness),
          color: recipe.resultado.color,
          typeId: type.id,
          categoryId: category.id,
          composition: 'LOCKED_BY_FUSION',
          formula: 'Bloqueado (Escanea por foto)',
          environment: 'Bloqueado (Escanea por foto)',
          commonUses: 'Bloqueado (Escanea por foto)',
          streak: 'Bloqueado',
          texture: 'Bloqueado',
          density: 2.6,
          transparency: 0,
          tenacity: 1,
          imgUrl: 'default.jpg',
          mindatUrl: 'https://www.mindat.org/'
        })
      }

      targetRock = fused
    } else {
      const fallbackRocks = await models.Rock.findAll({
        where: { id: { [Op.notIn]: [rock1.id, rock2.id] } },
        limit: 15
      })

      if (fallbackRocks.length > 0) {
        const randomIndex = (rock1.id + rock2.id) % fallbackRocks.length
        targetRock = fallbackRocks[randomIndex]
      } else {
        targetRock = rock1
      }
    }

    let collectionEntry = await models.Collection.findOne({
      where: { userId, rockId: targetRock.id }
    })

    if (collectionEntry) {
      return {
        success: true,
        alreadyDiscovered: true,
        newDiscovery: false,
        discoveredItem: targetRock.name,
        message: `¡Esta roca (${targetRock.name}) ya la descubriste anteriormente! Prueba combinando otras rocas distintas.`,
        rock: targetRock,
        collection: {
          rockId: collectionEntry.rockId,
          recognitionCount: collectionEntry.recognitionCount,
          firstDiscoveredAt: collectionEntry.firstDiscoveredAt
        }
      }
    }

    collectionEntry = await models.Collection.create({
      userId,
      rockId: targetRock.id,
      firstDiscoveredAt: new Date(),
      recognitionCount: 1
    })

    return {
      success: true,
      alreadyDiscovered: false,
      newDiscovery: true,
      discoveredItem: targetRock.name,
      message: `¡Descubriste ${targetRock.name} por fusión! Encuéntrala y tómale una foto para desbloquear toda su información geológica.`,
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