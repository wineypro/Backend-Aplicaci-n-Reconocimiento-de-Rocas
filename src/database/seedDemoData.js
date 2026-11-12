const referenceData = {
  Type: [
    { name: 'Ignea' },
    { name: 'Sedimentaria' },
    { name: 'Metamorfica' }
  ],
  Category: [
    { name: 'Volcanica', description: 'Rocas formadas por solidificacion de lava en superficie.' },
    { name: 'Plutonica', description: 'Rocas formadas por solidificacion lenta del magma en profundidad.' },
    { name: 'Clastica', description: 'Rocas sedimentarias formadas por fragmentos compactados.' },
    { name: 'Foliada', description: 'Rocas metamorfoseadas con minerales alineados en planos.' },
    { name: 'No Foliada', description: 'Rocas metamorfoseadas sin alineación mineral visible.' },
    { name: 'Rock', description: 'General rock specimen category from GeoDex API.' }
  ],
  Role: [
    { name: 'Estudiante' },
    { name: 'Docente' },
    { name: 'Admin' },
    { name: 'Usuario autenticado' }
  ],
  Achievement: [
    { slug: 'primera-roca', name: 'Primera roca', description: 'Realiza tu primer análisis geológico.', experience: 10, conditionType: 'total_recognitions', conditionValue: 1 },
    { slug: 'catalogo-inicial', name: 'Catálogo inicial', description: 'Descubre tus primeras 2 rocas distintas.', experience: 20, conditionType: 'distinct_rocks', conditionValue: 2 },
    { slug: 'first-discovery', name: 'Primer descubrimiento', description: 'Identifica tu primera roca.', experience: 10, conditionType: 'distinct_rocks', conditionValue: 1 },
    { slug: 'rock-explorer', name: 'Explorador de rocas', description: 'Descubre 3 rocas distintas.', experience: 25, conditionType: 'distinct_rocks', conditionValue: 3 },
    { slug: 'dedicated-identifier', name: 'Identificador dedicado', description: 'Realiza 10 reconocimientos.', experience: 50, conditionType: 'total_recognitions', conditionValue: 10 }
  ]
}

const rockData = [
  {
    type: 'Ignea',
    category: 'Volcanica',
    index: 1,
    name: 'Basalt',
    scientificName: 'Basalt',
    description: 'A dark, fine-grained extrusive igneous rock formed from the rapid cooling of low-viscosity lava.',
    composition: 'Calcium-rich plagioclase feldspar, pyroxene, and olivine.',
    formula: 'Not applicable (rock)',
    environment: 'Lava flows, oceanic crust, and volcanic plateaus.',
    commonUses: 'Construction aggregate, road base, cobblestones, and stone wool.',
    hardness: 6,
    streak: 'Not diagnostic',
    color: 'Dark gray to black',
    texture: 'Fine-grained, aphanitic or vesicular',
    density: 2.9,
    transparency: 0,
    tenacity: 1,
    imgUrl: 'https://example.org/basalt.jpg',
    mindatUrl: 'https://www.mindat.org/'
  },
  {
    type: 'Ignea',
    category: 'Plutonica',
    index: 2,
    name: 'Granite',
    scientificName: 'Granite',
    description: 'A coarse-grained intrusive igneous rock rich in quartz and feldspar.',
    composition: 'Typical composition includes quartz, feldspar, mica, and amphibole in varying proportions.',
    formula: 'Not applicable (rock)',
    environment: 'Crystallizes slowly underground from silica-rich magma.',
    commonUses: 'Building stone, countertops, monuments, and igneous rock labs.',
    hardness: 6,
    streak: 'Not diagnostic',
    color: 'Light gray, pink, white, or speckled',
    texture: 'Coarse-grained, phaneritic',
    density: 2.7,
    transparency: 0,
    tenacity: 1,
    imgUrl: 'https://example.org/granite.jpg',
    mindatUrl: 'https://www.mindat.org/'
  },
  {
    type: 'Sedimentaria',
    category: 'Clastica',
    index: 3,
    name: 'Sandstone',
    scientificName: 'Sandstone',
    description: 'A clastic sedimentary rock composed mainly of sand-sized mineral particles or rock fragments.',
    composition: 'Quartz and feldspar grains cemented by silica, calcite, or iron oxide.',
    formula: 'Not applicable (rock)',
    environment: 'Beaches, deserts, river channels, and shallow marine deltas.',
    commonUses: 'Building stone, paving, facade cladding, and aquifer reservoir rock.',
    hardness: 6,
    streak: 'Not diagnostic',
    color: 'Tan, brown, yellow, red, gray, or white',
    texture: 'Clastic, medium-grained (sand-sized)',
    density: 2.3,
    transparency: 0,
    tenacity: 1,
    imgUrl: 'https://example.org/sandstone.jpg',
    mindatUrl: 'https://www.mindat.org/'
  },
  {
    type: 'Metamorfica',
    category: 'Foliada',
    index: 4,
    name: 'Slate',
    scientificName: 'Slate',
    description: 'A fine-grained, foliated, homogeneous metamorphic rock derived from shale-type sedimentary rock.',
    composition: 'Quartz, muscovite or illite mica, chlorite, and accessory hematite or pyrite.',
    formula: 'Not applicable (rock)',
    environment: 'Low-grade regional metamorphism of mudstone or shale.',
    commonUses: 'Roofing tiles, flooring, blackboards, and billiard tables.',
    hardness: 4,
    streak: 'Not diagnostic',
    color: 'Dark gray, bluish gray, green, or purple',
    texture: 'Fine-grained, foliated (slaty cleavage)',
    density: 2.7,
    transparency: 0,
    tenacity: 1,
    imgUrl: 'https://example.org/slate.jpg',
    mindatUrl: 'https://www.mindat.org/'
  }
]

async function findOrCreateByNaturalKey(model, where, values) {
  const existing = await model.findOne({ where, paranoid: false })
  if (existing) return existing
  return model.create(values)
}

async function nextAvailableRockIndex(Rock, preferredIndex) {
  let index = preferredIndex
  while (await Rock.findOne({ where: { index }, paranoid: false })) index += 1
  return index
}

async function seedDemoData(models) {
  const references = {}
  for (const [modelName, records] of Object.entries(referenceData)) {
    const model = models[modelName]
    if (!model) throw new Error(`Cannot seed demo data: model ${modelName} is unavailable.`)
    references[modelName] = new Map()
    for (const record of records) {
      const key = modelName === 'Achievement' ? 'slug' : 'name'

      if (modelName === 'Achievement') {
        let ach = await model.findOne({ where: { [key]: record[key] }, paranoid: false })
        if (ach) {
          await ach.update({ conditionType: record.conditionType, conditionValue: record.conditionValue })
        } else {
          ach = await model.create(record)
        }
        references[modelName].set(record[key], ach)
        continue
      }

      const row = await findOrCreateByNaturalKey(model, { [key]: record[key] }, record)
      references[modelName].set(record[key], row)
    }
  }

  const Rock = models.Rock
  if (!Rock) throw new Error('Cannot seed demo data: model Rock is unavailable.')
  for (const rock of rockData) {
    const type = references.Type.get(rock.type)
    const category = references.Category.get(rock.category)
    if (!type || !category) throw new Error(`Cannot seed demo data: missing reference for ${rock.scientificName}.`)
    const existing = await Rock.unscoped().findOne({ where: { scientificName: rock.scientificName }, paranoid: false })
    const { type: _type, category: _category, ...values } = rock

    if (existing) {
      // Actualizar el nombre y descripción a inglés para que coincida con la API si aún tenía datos antiguos
      await existing.update({
        name: values.name,
        description: values.description,
        composition: values.composition,
        formula: values.formula,
        environment: values.environment,
        commonUses: values.commonUses,
        streak: values.streak,
        color: values.color,
        texture: values.texture,
        typeId: type.id,
        categoryId: category.id
      })
      continue
    }

    const index = await nextAvailableRockIndex(Rock, values.index)
    await Rock.create({
      ...values,
      index,
      typeId: type.id,
      categoryId: category.id
    })
  }
}

module.exports = { seedDemoData }