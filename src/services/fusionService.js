const { Op } = require('sequelize')
const { HttpError } = require('../utils/httpError')

// Recetas geológicas lógicas y en español
const RECIPES = [
  {
    ingredientes: ['Basalto', 'Granito'],
    resultado: {
      name: 'Obsidiana', scientificName: 'Obsidian', type: 'Ignea', category: 'Volcanica',
      description: 'Vidrio volcánico formado por el rápido enfriamiento de la mezcla magmática.',
      hardness: 5, color: 'Negro brillante', index: 901
    }
  },
  {
    ingredientes: ['Arenisca', 'Basalto'],
    resultado: {
      name: 'Cuarcita', scientificName: 'Quartzite', type: 'Metamorfica', category: 'No Foliada',
      description: 'Roca metamórfica muy dura formada por el calentamiento extremo de la arenisca.',
      hardness: 7, color: 'Blanco o grisáceo', index: 902
    }
  },
  {
    ingredientes: ['Pizarra', 'Granito'],
    resultado: {
      name: 'Gneis', scientificName: 'Gneiss', type: 'Metamorfica', category: 'Foliada',
      description: 'Roca metamórfica de alto grado con bandas claras y oscuras.',
      hardness: 6, color: 'Bandeado', index: 903
    }
  },
  {
    ingredientes: ['Arenisca', 'Pizarra'],
    resultado: {
      name: 'Conglomerado', scientificName: 'Conglomerate', type: 'Sedimentaria', category: 'Clastica',
      description: 'Roca sedimentaria formada por la consolidación de fragmentos de otras rocas.',
      hardness: 4, color: 'Gris moteado', index: 904
    }
  }
];

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

    const ingNames = [rock1.name, rock2.name];
    
    // Buscar receta que contenga ambos nombres (sin importar el orden)
    const recipe = RECIPES.find(r => 
      r.ingredientes.includes(ingNames[0]) && r.ingredientes.includes(ingNames[1])
    );

    let targetRock;
    let message;
    let isNewSynthesis = false;

    if (recipe) {
      // Asegurar que existan el Tipo y la Categoría en español para no duplicar en inglés
      const [type] = await models.Type.findOrCreate({ where: { name: recipe.resultado.type } });
      const [category] = await models.Category.findOrCreate({ 
        where: { name: recipe.resultado.category },
        defaults: { description: 'Categoría geológica obtenida por fusión' }
      });

      // Obtener o crear la roca resultante en el catálogo local
      const [fused, created] = await models.Rock.findOrCreate({
        where: { scientificName: recipe.resultado.scientificName },
        defaults: {
          name: recipe.resultado.name,
          index: recipe.resultado.index,
          description: recipe.resultado.description,
          hardness: recipe.resultado.hardness,
          color: recipe.resultado.color,
          typeId: type.id,
          categoryId: category.id,
          composition: 'Minerales fusionados',
          formula: 'Variable',
          environment: 'Metamorfismo de laboratorio',
          commonUses: 'Estudio y Coleccionismo',
          streak: 'Blanca',
          texture: 'Sintética',
          density: 2.5,
          transparency: 0,
          tenacity: 1,
          imgUrl: 'https://via.placeholder.com/400x400.png?text=' + encodeURIComponent(recipe.resultado.name),
          mindatUrl: 'https://www.mindat.org/'
        }
      });
      targetRock = fused;
      message = `¡Fusión exitosa! La presión y temperatura entre ${rock1.name} y ${rock2.name} generaron ${targetRock.name}.`;
      isNewSynthesis = created;
    } else {
      // Si la receta no existe, devuelve otra roca aleatoria del catálogo (que no sean ellas mismas)
      const fallbackRocks = await models.Rock.findAll({
        where: { id: { [Op.notIn]: [rock1.id, rock2.id] } },
        limit: 15
      });
      
      if (fallbackRocks.length > 0) {
        const randomIndex = (rock1.id + rock2.id + new Date().getSeconds()) % fallbackRocks.length;
        targetRock = fallbackRocks[randomIndex];
        message = `La combinación fue inestable y los minerales recristalizaron de forma impredecible en ${targetRock.name}.`;
      } else {
         targetRock = rock1;
         message = `La fusión falló y los minerales regresaron a su estado base de ${rock1.name}.`;
      }
    }

    // Guardar el resultado en la colección del usuario sí o sí
    let collectionEntry = await models.Collection.findOne({ where: { userId, rockId: targetRock.id } });
    const newDiscovery = !collectionEntry;

    if (collectionEntry) {
      await collectionEntry.update({ recognitionCount: collectionEntry.recognitionCount + 1 });
    } else {
      collectionEntry = await models.Collection.create({
        userId,
        rockId: targetRock.id,
        firstDiscoveredAt: new Date(),
        recognitionCount: 1
      });
    }

    return {
      success: true,
      message,
      discoveredItem: targetRock.name,
      newDiscovery,
      rock: targetRock,
      collection: {
        rockId: collectionEntry.rockId,
        recognitionCount: collectionEntry.recognitionCount,
        firstDiscoveredAt: collectionEntry.firstDiscoveredAt
      }
    };
  }
})

module.exports = { createFusionService }