const test = require('node:test')
const assert = require('node:assert/strict')
const { createAiService } = require('../src/services/aiService')

test('uses the catalog attached to the top prediction when result contains only identification data', async () => {
  const originalUrl = process.env.GEODEX_API_URL
  const originalFetch = global.fetch
  process.env.GEODEX_API_URL = 'https://geodex.example/api/v1/identify'
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      success: true,
      result: {
        label: 'Tuff',
        confidence: 52,
        scientific_name: 'Tuff',
        specimen_id: 216
      },
      predictions: [{
        label: 'Tuff',
        scientific_name: 'Tuff',
        confidence: 52,
        catalog: {
          scientific_name: 'Tuff',
          category: 'Rock',
          rock_type: 'Igneous',
          description: 'Tuff is a common igneous rock used in field identification and teaching collections.',
          hardness: 'Variable',
          color: 'White, gray, tan, pink, greenish, or brown',
          texture: 'Pyroclastic ash, fragments, or welded texture',
          density: 'Variable, often light to moderate'
        }
      }]
    })
  })

  try {
    const result = await createAiService().identifyRock('image-data')
    assert.equal(result.rockName, 'Tuff')
    assert.equal(result.confidence, 52)
    assert.equal(result.catalog.rock_type, 'Igneous')
    assert.equal(result.catalog.color, 'White, gray, tan, pink, greenish, or brown')
    assert.equal(result.catalog.texture, 'Pyroclastic ash, fragments, or welded texture')
  } finally {
    global.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.GEODEX_API_URL
    else process.env.GEODEX_API_URL = originalUrl
  }
})