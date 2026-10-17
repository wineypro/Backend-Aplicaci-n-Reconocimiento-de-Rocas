const { HttpError } = require('../utils/httpError')

// Catálogo local de respaldo con las 40 rocas de GeoDex clasificadas por rock_type
const CATALOG_BY_TYPE = {
  Igneous: [
    'Granite', 'Basalt', 'Diorite', 'Andesite', 'Obsidian', 'Pumice', 'Rhyolite',
    'Gabbro', 'Peridotite', 'Scoria', 'Tuff', 'Pegmatite', 'Diabase', 'Anorthosite'
  ],
  Sedimentary: [
    'Sandstone', 'Limestone', 'Conglomerate', 'Shale', 'Breccia', 'Mudstone',
    'Siltstone', 'Dolostone', 'Chert', 'Coal', 'Rock Salt', 'Travertine', 'Claystone'
  ],
  Metamorphic: [
    'Marble', 'Slate', 'Gneiss', 'Schist', 'Quartzite', 'Phyllite', 'Amphibolite',
    'Serpentinite', 'Migmatite', 'Hornfels', 'Soapstone', 'Anthracite', 'Greenschist'
  ]
}

// Recetas geológicas reales entre rocas del catálogo de GeoDex
const GEOLOGICAL_RECIPES = {
  'Basalt+Limestone': { target: 'Marble', reason: 'El calor del magma basáltico recristalizó la caliza en Mármol (Marble).' },
  'Granite+Limestone': { target: 'Marble', reason: 'El metamorfismo de contacto transformó la caliza en Mármol (Marble).' },
  'Granite+Sandstone': { target: 'Quartzite', reason: 'La alta temperatura y presión fusionaron los granos de cuarzo en Cuarcita (Quartzite).' },
  'Basalt+Sandstone': { target: 'Quartzite', reason: 'El calor volcánico recristalizó la arenisca formando Cuarcita (Quartzite).' },
  'Basalt+Shale': { target: 'Slate', reason: 'La presión y el calor compactaron la lutita en Pizarra (Slate).' },
  'Granite+Shale': { target: 'Schist', reason: 'El metamorfismo regional transformó la lutita en Esquisto (Schist).' },
  'Granite+Slate': { target: 'Phyllite', reason: 'El incremento de grado metamórfico convirtió la pizarra en Filita (Phyllite).' },
  'Granite+Schist': { target: 'Gneiss', reason: 'El metamorfismo de alto grado separó los minerales en bandas de Gneis (Gneiss).' },
  'Gneiss+Granite': { target: 'Migmatite', reason: 'La fusión parcial entre roca ígnea y metamórfica creó una Migmatita (Migmatite).' },
  'Basalt+Granite': { target: 'Diorite', reason: 'La mezcla de magmas félsico y máfico cristalizó en Diorita (Diorite).' },
  'Andesite+Diorite': { target: 'Granite', reason: 'La diferenciación magmática lenta produjo Granito (Granite).' },
  'Obsidian+Pumice': { target: 'Rhyolite', reason: 'La cristalización del vidrio y la espuma volcánica formó Riolita (Rhyolite).' },
  'Basalt+Scoria': { target: 'Tuff', reason: 'La consolidación de fragmentos volcánicos y ceniza formó Toba volcánica (Tuff).' },
  'Basalt+Peridotite': { target: 'Serpentinite', reason: 'La alteración hidrotermal ultramáfica produjo Serpentinita (Serpentinite).' },
  'Basalt+Coal': { target: 'Anthracite', reason: 'El calor extremo metamorfizó el carbón en Antracita (Anthracite) de alta pureza.' },
  'Granite+Coal': { target: 'Anthracite', reason: 'La presión y temperatura transformaron el carbón sedimentario en Antracita (Anthracite).' },
  'Limestone+Mudstone': { target: 'Dolostone', reason: 'El reemplazo rico en magnesio transformó los sedimentos en Dolomía (Dolostone).' },
  'Mudstone+Sandstone': { target: 'Conglomerate', reason: 'La cementación de clastos y matriz fina formó un Conglomerado (Conglomerate).' }
}

// Caché en memoria para no repetir llamadas HTTP al catálogo de GeoDex
let specimensCache = null

const getApiOrigin = () => {
  if (!process.env.GEODEX_API_URL) return null
  try {
    return new URL(process.env.GEODEX_API_URL).origin
  } catch {
    return null
  }
}

const fetchGeoDexRocks = async () => {
  if (specimensCache) return specimensCache
  const origin = getApiOrigin()
  if (!origin) return []

  try {
    const response = await fetch(`${origin}/api/specimens?category=Rock`, {
      headers: process.env.GEODEX_API_KEY
        ? { Authorization: `Bearer ${process.env.GEODEX_API_KEY}` }
        : {}
    })
    if (!response.ok) return []

    const json = await response.json()
    if (json && json.success && Array.isArray(json.data)) {
      specimensCache = json.data.filter(item => item.category === 'Rock')
      return specimensCache
    }
  } catch {
    // Si la API externa no está disponible, operamos con el catálogo local de respaldo
  }
  return []
}

const resolveTypeFromCatalog = (rockName) => {
  for (const [type, list] of Object.entries(CATALOG_BY_TYPE)) {
    if (list.some(r => r.toLowerCase() === String(rockName).toLowerCase())) {
      return type
    }
  }
  return 'Metamorphic'
}

const pickFusionResult = (rockA, rockB, typeA, typeB, apiCatalog) => {
  const nameA = rockA.scientificName || rockA.name
  const nameB = rockB.scientificName || rockB.name
  const sortedKey = [nameA, nameB].sort().join('+')

  // 1. Si existe una receta geológica directa entre ambas rocas
  if (GEOLOGICAL_RECIPES[sortedKey]) {
    return GEOLOGICAL_RECIPES[sortedKey]
  }

  // 2. Si el catálogo de la API indica especímenes similares (similar_specimens),
  // priorizamos una roca relacionada que no sea ninguna de las dos originales
  const apiSpecimenA = apiCatalog.find(s => s.scientific_name === nameA || s.name === nameA)
  const apiSpecimenB = apiCatalog.find(s => s.scientific_name === nameB || s.name === nameB)
  const similarCandidates = [
    ...(apiSpecimenA?.similar_specimens || []),
    ...(apiSpecimenB?.similar_specimens || [])
  ].filter(sim => sim !== nameA && sim !== nameB)

  if (similarCandidates.length > 0) {
    const chosen = similarCandidates[(rockA.id + rockB.id) % similarCandidates.length]
    return {
      target: chosen,
      reason: `¡La afinidad mineralógica entre ${rockA.name} y ${rockB.name} ha generado ${chosen}!`
    }
  }

  // 3. Regla general del ciclo de las rocas según su rock_type
  const types = [typeA, typeB].sort().join('+')
  let targetPool = CATALOG_BY_TYPE.Metamorphic
  let reason = `¡La presión y temperatura entre ${rockA.name} y ${rockB.name} provocaron metamorfismo!`

  if (types === 'Igneous+Igneous') {
    targetPool = CATALOG_BY_TYPE.Igneous
    reason = `¡La mezcla y enfriamiento de dos magmas ígneos cristalizó una nueva roca ígnea!`
  } else if (types === 'Sedimentary+Sedimentary') {
    targetPool = CATALOG_BY_TYPE.Sedimentary
    reason = `¡La compactación y litificación de ambos sedimentos formó un nuevo estrato sedimentario!`
  }

  const filteredPool = targetPool.filter(r => r !== nameA && r !== nameB)
  const target = filteredPool[(rockA.id + rockB.id) % filteredPool.length] || 'Marble'

  return { target, reason }
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

    const typeObj1 = rock1.typeId ? await models.Type.findByPk(rock1.typeId) : null
    const typeObj2 = rock2.typeId ? await models.Type.findByPk(rock2.typeId) : null

    const type1 = typeObj1 ? typeObj1.name : resolveTypeFromCatalog(rock1.scientificName || rock1.name)
    const type2 = typeObj2 ? typeObj2.name : resolveTypeFromCatalog(rock2.scientificName || rock2.name)

    // Consultamos el catálogo de GeoDex (/api/specimens?category=Rock)
    const apiCatalog = await fetchGeoDexRocks()
    const fusionPlan = pickFusionResult(rock1, rock2, type1, type2, apiCatalog)

    // Buscamos los datos oficiales de la roca resultante en GeoDex
    const specimenData = apiCatalog.find(
      s =>
        s.name?.toLowerCase() === fusionPlan.target.toLowerCase() ||
        s.scientific_name?.toLowerCase() === fusionPlan.target.toLowerCase()
    ) || {}

    const targetScientificName = specimenData.scientific_name || fusionPlan.target
    const targetName = specimenData.name || fusionPlan.target
    const targetRockType = specimenData.rock_type || resolveTypeFromCatalog(targetScientificName)

    const [category] = await models.Category.findOrCreate({
      where: { name: specimenData.category || 'Rock' },
      defaults: { description: 'Categoría registrada desde el catálogo de GeoDex' }
    })

    const [type] = await models.Type.findOrCreate({
      where: { name: targetRockType }
    })

    const origin = getApiOrigin()
    const resolvedImgUrl = specimenData.image_url
      ? (specimenData.image_url.startsWith('http') ? specimenData.image_url : `${origin || ''}${specimenData.image_url}`)
      : 'default.jpg'

    // Guardamos o recuperamos la roca resultante en la base de datos local
    const [fusedRock] = await models.Rock.findOrCreate({
      where: { scientificName: targetScientificName },
      defaults: {
        name: targetName,
        categoryId: category.id,
        typeId: type.id,
        description: specimenData.description || `Roca ${targetRockType} obtenida por fusión geológica.`,
        index: specimenData.dex_number || specimenData.id || Math.floor(Math.random() * 1000) + 200,
        composition: specimenData.composition || 'No especificada',
        formula: specimenData.formula || 'N/A', // En rocas viene null en la API
        environment: specimenData.formation_environment || 'Formada por procesos de fusión y metamorfismo.',
        commonUses: specimenData.common_uses || 'Estudio geológico y construcción.',
        hardness: specimenData.hardness || 'Variable',
        streak: specimenData.streak || 'Not diagnostic',
        color: specimenData.color || 'Variado',
        texture: specimenData.texture || 'Variable',
        density: specimenData.density || 'Variable',
        transparency: 'Opaco',
        tenacity: 'Quebradizo',
        imgUrl: resolvedImgUrl,
        mindatUrl: 'https://www.mindat.org/'
      }
    })

    // Añadimos la nueva roca descubierta a la colección del usuario
    let collectionEntry = await models.Collection.findOne({
      where: { userId, rockId: fusedRock.id }
    })
    const newDiscovery = !collectionEntry

    if (collectionEntry) {
      await collectionEntry.update({ recognitionCount: collectionEntry.recognitionCount + 1 })
    } else {
      collectionEntry = await models.Collection.create({
        userId,
        rockId: fusedRock.id,
        firstDiscoveredAt: new Date(),
        recognitionCount: 1
      })
    }

    return {
      success: true,
      message: fusionPlan.reason,
      discoveredItem: fusedRock.name,
      newDiscovery,
      rock: {
        id: fusedRock.id,
        dexNumber: fusedRock.index,
        name: fusedRock.name,
        scientificName: fusedRock.scientificName,
        rockType: targetRockType,
        rarity: specimenData.rarity || 'Common',
        description: fusedRock.description,
        composition: fusedRock.composition,
        environment: fusedRock.environment,
        similarSpecimens: specimenData.similar_specimens || []
      },
      collection: {
        rockId: collectionEntry.rockId,
        recognitionCount: collectionEntry.recognitionCount,
        firstDiscoveredAt: collectionEntry.firstDiscoveredAt
      }
    }
  }
})

module.exports = { createFusionService }