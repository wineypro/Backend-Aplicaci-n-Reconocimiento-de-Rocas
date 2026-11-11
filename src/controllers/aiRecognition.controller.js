const models = require('../models')
const { createGuestSessionService } = require('../services/guestSessionService')
const { createAchievementService } = require('../services/achievementService')
const { createRecognitionService } = require('../services/recognitionService')
const { Op } = require('sequelize')

const { Rock, Category, Type } = models

const guestSessions = createGuestSessionService({ GuestSession: models.GuestSession })
const fullRecognitionService = createRecognitionService({
  models,
  sequelize: models.sequelize || Rock.sequelize,
  guestSessions,
  achievements: createAchievementService({ models })
})

const TRANSLATIONS = {
  types: {
    Igneous: 'Ignea',
    Sedimentary: 'Sedimentaria',
    Metamorphic: 'Metamorfica',
    Mineral: 'Mineral'
  },
  categories: {
    Rock: 'Roca',
    Mineral: 'Mineral',
    Volcanic: 'Volcanica',
    Plutonic: 'Plutonica',
    Clastic: 'Clastica',
    Foliated: 'Foliada',
    'Non-foliated': 'No Foliada',
    Chemical: 'Quimica',
    Organic: 'Organica'
  }
}

// Diccionario de nombres inglés -> español
const EN_TO_ES_NAMES = {
  obsidian: 'Obsidiana',
  quartzite: 'Cuarcita',
  gneiss: 'Gneis',
  conglomerate: 'Conglomerado',
  marble: 'Mármol',
  andesite: 'Andesita',
  basalt: 'Basalto',
  granite: 'Granito',
  sandstone: 'Arenisca',
  slate: 'Pizarra',
  limestone: 'Caliza',
  diorite: 'Diorita',
  pumice: 'Pumita',
  rhyolite: 'Riolita',
  gabbro: 'Gabro',
  peridotite: 'Peridotita',
  scoria: 'Escoria',
  tuff: 'Toba Volcánica',
  pegmatite: 'Pegmatita',
  diabase: 'Diabasa',
  anorthosite: 'Anortosita',
  shale: 'Lutita',
  breccia: 'Brecha',
  mudstone: 'Fangolita',
  siltstone: 'Limolita',
  dolostone: 'Dolomía',
  chert: 'Sílex',
  coal: 'Carbón',
  'rock salt': 'Halita (Sal de Roca)',
  travertine: 'Travertino',
  claystone: 'Arcillolita',
  schist: 'Esquisto',
  phyllite: 'Filita',
  amphibolite: 'Anfibolita',
  serpentinite: 'Serpentinita',
  migmatite: 'Migmatita',
  hornfels: 'Corneana',
  soapstone: 'Esteatita',
  anthracite: 'Antracita',
  greenschist: 'Esquisto Verde',
  quartz: 'Cuarzo',
  amethyst: 'Amatista',
  agate: 'Ágata',
  calcite: 'Calcita'
}

// Convertidor automático de textos geológicos de Inglés a Español
const translateGeologicalText = (text, fallback) => {
  if (!text || typeof text !== 'string') return fallback
  let out = text.trim()

  const phraseMap = [
    [/Not applicable \(rock\)/gi, 'No aplica (Roca)'],
    [/Not diagnostic/gi, 'No diagnóstica'],
    [/Variable, commonly hard/gi, 'Variable, comúnmente dura'],
    [/Variable, commonly medium/gi, 'Variable, dureza media'],
    [/Variable, commonly soft/gi, 'Variable, comúnmente blanda'],
    [/Coarse-grained/gi, 'Grano grueso'],
    [/Fine-grained/gi, 'Grano fino'],
    [/Medium-grained/gi, 'Grano medio'],
    [/Glassy/gi, 'Vítrea'],
    [/Vesicular/gi, 'Vesicular (porosa)'],
    [/Foliated/gi, 'Foliada (laminada)'],
    [/Non-foliated/gi, 'No foliada'],
    [/Clastic/gi, 'Clástica'],
    [/Crystalline/gi, 'Cristalina'],
    [/Intrusive igneous rock/gi, 'Roca ígnea intrusiva'],
    [/Extrusive igneous rock/gi, 'Roca ígnea extrusiva'],
    [/Volcanic glass/gi, 'Vidrio volcánico'],
    [/Sedimentary rock/gi, 'Roca sedimentaria'],
    [/Metamorphic rock/gi, 'Roca metamórfica'],
    [/quartz/gi, 'cuarzo'],
    [/feldspar/gi, 'feldespato'],
    [/plagioclase/gi, 'plagioclasa'],
    [/pyroxene/gi, 'piroxeno'],
    [/olivine/gi, 'olivino'],
    [/biotite/gi, 'biotita'],
    [/muscovite/gi, 'moscovita'],
    [/calcite/gi, 'calcita'],
    [/clay minerals/gi, 'minerales arcillosos'],
    [/amphibole/gi, 'anfíbol'],
    [/hornblende/gi, 'hornblenda'],
    [/construction/gi, 'construcción'],
    [/dimension stone/gi, 'piedra dimensionada'],
    [/countertops/gi, 'encimeras'],
    [/monuments/gi, 'monumentos'],
    [/paving/gi, 'pavimentación'],
    [/aggregates/gi, 'agregados de construcción'],
    [/sculpture/gi, 'escultura'],
    [/architecture/gi, 'arquitectura'],
    [/ornamental stone/gi, 'piedra ornamental'],
    [/White to light gray/gi, 'Blanca a gris claro'],
    [/White/gi, 'Blanca'],
    [/Black/gi, 'Negro'],
    [/Dark gray/gi, 'Gris oscuro'],
    [/Light gray/gi, 'Gris claro'],
    [/Gray/gi, 'Gris'],
    [/Pink/gi, 'Rosado'],
    [/Reddish/gi, 'Rojizo'],
    [/Greenish/gi, 'Verdoso'],
    [/Brown/gi, 'Marrón'],
    [/Yellowish/gi, 'Amarillento'],
    [/Banded/gi, 'Bandeado'],
    [/Mottled/gi, 'Moteado']
  ]

  for (const [regex, replacement] of phraseMap) {
    out = out.replace(regex, replacement)
  }

  return out
}

const KNOWN_ROCK_TYPES = {
  sandstone: 'Sedimentaria', arenisca: 'Sedimentaria',
  limestone: 'Sedimentaria', caliza: 'Sedimentaria',
  conglomerate: 'Sedimentaria', conglomerado: 'Sedimentaria',
  shale: 'Sedimentaria', lutita: 'Sedimentaria',
  breccia: 'Sedimentaria', brecha: 'Sedimentaria',
  mudstone: 'Sedimentaria', fangolita: 'Sedimentaria',
  siltstone: 'Sedimentaria', limolita: 'Sedimentaria',
  dolostone: 'Sedimentaria', dolomia: 'Sedimentaria', 'dolomía': 'Sedimentaria', dolomite: 'Sedimentaria',
  chert: 'Sedimentaria', silex: 'Sedimentaria', 'sílex': 'Sedimentaria',
  coal: 'Sedimentaria', carbon: 'Sedimentaria', 'carbón': 'Sedimentaria',
  'rock salt': 'Sedimentaria', halite: 'Sedimentaria', halita: 'Sedimentaria',
  travertine: 'Sedimentaria', travertino: 'Sedimentaria',
  claystone: 'Sedimentaria', arcillolita: 'Sedimentaria',
  chalk: 'Sedimentaria', coquina: 'Sedimentaria',
  marble: 'Metamorfica', marmol: 'Metamorfica', 'mármol': 'Metamorfica',
  slate: 'Metamorfica', pizarra: 'Metamorfica',
  gneiss: 'Metamorfica', gneis: 'Metamorfica',
  schist: 'Metamorfica', esquisto: 'Metamorfica',
  quartzite: 'Metamorfica', cuarcita: 'Metamorfica',
  phyllite: 'Metamorfica', filita: 'Metamorfica',
  amphibolite: 'Metamorfica', anfibolita: 'Metamorfica',
  serpentinite: 'Metamorfica', serpentinita: 'Metamorfica',
  migmatite: 'Metamorfica', migmatita: 'Metamorfica',
  hornfels: 'Metamorfica', corneana: 'Metamorfica',
  soapstone: 'Metamorfica', esteatita: 'Metamorfica',
  anthracite: 'Metamorfica', antracita: 'Metamorfica',
  greenschist: 'Metamorfica', 'esquisto verde': 'Metamorfica',
  eclogite: 'Metamorfica', granulite: 'Metamorfica',
  granite: 'Ignea', granito: 'Ignea',
  basalt: 'Ignea', basalto: 'Ignea',
  diorite: 'Ignea', diorita: 'Ignea',
  andesite: 'Ignea', andesita: 'Ignea',
  obsidian: 'Ignea', obsidiana: 'Ignea',
  pumice: 'Ignea', pumita: 'Ignea', 'piedra pomez': 'Ignea',
  rhyolite: 'Ignea', riolita: 'Ignea',
  gabbro: 'Ignea', gabro: 'Ignea',
  peridotite: 'Ignea', peridotita: 'Ignea',
  scoria: 'Ignea', escoria: 'Ignea',
  tuff: 'Ignea', toba: 'Ignea', 'toba volcánica': 'Ignea',
  pegmatite: 'Ignea', pegmatita: 'Ignea',
  diabase: 'Ignea', diabasa: 'Ignea',
  anorthosite: 'Ignea', anortosita: 'Ignea',
  syenite: 'Ignea', dacite: 'Ignea', komatiite: 'Ignea'
}

const inferGeologicalType = (catalogInfo, fallbackName) => {
  const explicit = catalogInfo.rock_type || catalogInfo.type || catalogInfo.rockType || catalogInfo.mineral_type
  if (explicit) {
    return TRANSLATIONS.types[explicit] || explicit
  }

  const candidates = [
    catalogInfo.scientific_name,
    catalogInfo.name,
    fallbackName
  ]
    .filter(Boolean)
    .map(s => String(s).trim().toLowerCase())

  for (const name of candidates) {
    if (KNOWN_ROCK_TYPES[name]) return KNOWN_ROCK_TYPES[name]
    for (const [key, val] of Object.entries(KNOWN_ROCK_TYPES)) {
      if (name.includes(key)) return val
    }
  }

  if (String(catalogInfo.category || '').toLowerCase() === 'mineral') {
    return 'Mineral'
  }

  return 'Mineral / Otro'
}

const parseHardnessInt = (rawHardness) => {
  if (typeof rawHardness === 'number' && Number.isFinite(rawHardness)) {
    return Math.min(10, Math.max(1, Math.round(rawHardness)))
  }
  if (typeof rawHardness === 'string') {
    const matches = rawHardness.match(/\d+(\.\d+)?/g)
    if (matches && matches.length > 0) {
      const avg = matches.reduce((acc, v) => acc + Number(v), 0) / matches.length
      return Math.min(10, Math.max(1, Math.round(avg)))
    }
    const lower = rawHardness.toLowerCase()
    if (lower.includes('soft') || lower.includes('blanda')) return 3
    if (lower.includes('hard') || lower.includes('dura')) return 6
  }
  return 6
}

const parseDensityNumber = (rawDensity) => {
  if (typeof rawDensity === 'number' && Number.isFinite(rawDensity)) return rawDensity
  if (typeof rawDensity === 'string') {
    const matches = rawDensity.match(/\d+(\.\d+)?/g)
    if (matches && matches.length >= 2) {
      return Number(((Number(matches[0]) + Number(matches[1])) / 2).toFixed(2))
    }
    if (matches && matches.length === 1) {
      return Number(matches[0])
    }
  }
  return 2.7
}

const getSafeUniqueIndex = async (preferredIndex) => {
  const candidate = Number(preferredIndex)
  if (Number.isInteger(candidate) && candidate > 0) {
    const existing = await Rock.unscoped().findOne({ where: { index: candidate }, paranoid: false })
    if (!existing) return candidate
  }
  const allRocks = await Rock.unscoped().findAll({ attributes: ['index'], paranoid: false })
  const used = new Set(allRocks.map(r => Number(r.index)).filter(Number.isFinite))
  let nextIdx = 10
  while (used.has(nextIdx)) nextIdx += 1
  return nextIdx
}

const createAiRecognitionController = (_ignoredService, aiService) => ({
  autoRecognize: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Por favor selecciona o captura una fotografía para escanear.' })
      }

      const base64Image = req.file.buffer.toString('base64')
      const mimeType = req.file.mimetype || 'image/jpeg'
      const uploadedDataUrl = `data:${mimeType};base64,${base64Image}`

      const aiResult = await aiService.identifyRock(base64Image)
      const catalogInfo = aiResult.catalog || {}

      const translatedType = inferGeologicalType(catalogInfo, aiResult.rockName)
      const rawCat = catalogInfo.category || (translatedType === 'Mineral / Otro' ? 'Mineral' : 'Rock')
      const translatedCat = TRANSLATIONS.categories[rawCat] || rawCat

      const [category] = await Category.findOrCreate({
        where: { name: translatedCat },
        defaults: { description: 'Categoría geológica del catálogo' }
      })

      const [type] = await Type.findOrCreate({
        where: { name: translatedType }
      })

      const scientificNameToSearch = String(catalogInfo.scientific_name || aiResult.rockName || '').trim()
      const rawCommonName = String(catalogInfo.name || aiResult.rockName || '').trim()
      const spanishTranslation =
        EN_TO_ES_NAMES[scientificNameToSearch.toLowerCase()] ||
        EN_TO_ES_NAMES[rawCommonName.toLowerCase()]
      const commonName = spanishTranslation || rawCommonName

      const searchCandidates = Array.from(
        new Set([scientificNameToSearch, rawCommonName, commonName].filter(Boolean))
      )

      // Liberar scientificName si pertenecía a una roca borrada lógicamente
      const deletedConflict = await Rock.unscoped().findOne({
        where: {
          scientificName: { [Op.in]: searchCandidates }
        },
        paranoid: false
      })
      if (deletedConflict && deletedConflict.deletedAt) {
        await deletedConflict.update(
          { scientificName: `${deletedConflict.scientificName}_del_${deletedConflict.id}_${Date.now()}` },
          { paranoid: false }
        )
      }

      // Buscar si ya existe en el catálogo (incluyendo las descubiertas por fusión)
      let localRock = await Rock.findOne({
        where: {
          [Op.or]: [
            { scientificName: { [Op.in]: searchCandidates } },
            { name: { [Op.in]: searchCandidates } }
          ]
        }
      })

      const basePayload = {
        name: localRock ? localRock.name : commonName,
        scientificName: localRock ? localRock.scientificName : scientificNameToSearch,
        categoryId: category.id,
        typeId: type.id,
        description: translateGeologicalText(
          catalogInfo.description,
          'Espécimen geológico identificado mediante escaneo.'
        ),
        composition: translateGeologicalText(
          catalogInfo.composition,
          'Minerales formadores de roca según espécimen.'
        ),
        formula: translateGeologicalText(catalogInfo.formula, 'No aplica (Roca)'),
        environment: translateGeologicalText(
          catalogInfo.formation_environment,
          'Corteza terrestre'
        ),
        commonUses: translateGeologicalText(
          catalogInfo.common_uses,
          'Estudio geológico y construcción'
        ),
        hardness: parseHardnessInt(catalogInfo.hardness),
        streak: translateGeologicalText(catalogInfo.streak, 'No diagnóstica'),
        color: translateGeologicalText(catalogInfo.color, 'Característico del espécimen'),
        texture: translateGeologicalText(catalogInfo.texture, 'Granular / Cristalina'),
        density: parseDensityNumber(catalogInfo.density),
        transparency: 0,
        tenacity: 1,
        mindatUrl: 'https://www.mindat.org/'
      }

      if (!localRock) {
        const uniqueIndex = await getSafeUniqueIndex(catalogInfo.dex_number || catalogInfo.id)
        localRock = await Rock.create({
          ...basePayload,
          index: uniqueIndex,
          imgUrl: uploadedDataUrl || catalogInfo.image_url || 'default.jpg'
        })
      } else {
        await localRock.update({
          ...basePayload,
          index: localRock.index,
          imgUrl: uploadedDataUrl || catalogInfo.image_url || localRock.imgUrl
        })
      }

      const actorId = req.user ? req.user.id : (req.guestSession ? req.guestSession.id : null)
      const actorKind = req.user ? 'user' : 'guest'
      const actor = req.actor || (actorId ? { kind: actorKind, id: actorId } : null)

      if (!actor) {
        return res.status(401).json({ message: 'Tu sesión ha expirado. Inicia sesión nuevamente.' })
      }

      // imageUrl debe ser <= 500 caracteres según recognitionService.js
      const shortImageRef =
        typeof catalogInfo.image_url === 'string' && catalogInfo.image_url.length <= 480
          ? catalogInfo.image_url
          : `captura_${localRock.id}_${Date.now()}.jpg`

      const result = await fullRecognitionService.recognize(actor, {
        rockId: localRock.id,
        confidence: aiResult.confidence,
        imageUrl: shortImageRef,
        note: 'Espécimen registrado mediante escáner'
      })

      const fullRock = await Rock.findByPk(localRock.id)

      return res.status(201).json({
        ...result,
        rock: fullRock || localRock
      })
    } catch (error) {
      return next(error)
    }
  }
})

module.exports = { createAiRecognitionController }