const { describe, test, after } = require('node:test')
const assert = require('node:assert/strict')
const { bootTestApp } = require('./helpers/testApp')

describe('Funciones implementadas por el estudiante', async () => {
  // Levantamos una única aplicación para toda la suite de pruebas
  let app
  
  test('Inicializar entorno', async () => {
    app = await bootTestApp('student_suite')
  })

  // --- Pruebas de Progreso y Estadísticas ---
  test('progress: returns total recognitions, distinct rocks, unlocked achievements and discovery percentage for a user', async () => {
    const { token } = await app.registerAndLogin('student')
    const progress = await app.request('GET', '/api/progress/me', { token })
    
    assert.equal(progress.status, 200)
    assert.ok('discoveryPercentage' in progress.body)
    assert.ok('totalRecognitions' in progress.body)
    assert.equal(progress.body.totalRecognitions, 0)
  })

  // --- Pruebas de Feedback ---
  test('feedback: an owner can create one feedback, second is rejected, and admin can list all', async () => {
    const { token } = await app.registerAndLogin('reviewer')
    const rock = await app.models.Rock.findOne()
    
    // 1. Crear un reconocimiento para evaluar
    const rec = await app.request('POST', '/api/recognition', { token, body: { rockId: rock.id, confidence: 95 } })
    const analysisId = rec.body.analysis.id

    // 2. Crear feedback exitoso
    const fb = await app.request('POST', `/api/recognition/${analysisId}/feedback`, { token, body: { isCorrect: true, comment: 'Excelente' } })
    assert.equal(fb.status, 201)
    assert.equal(fb.body.isCorrect, true)

    // 3. Intentar crear un segundo feedback para el mismo reconocimiento (debe fallar 409)
    const fb2 = await app.request('POST', `/api/recognition/${analysisId}/feedback`, { token, body: { isCorrect: false } })
    assert.equal(fb2.status, 409)

    // 4. Administrador puede listar todos los feedbacks
    const adminToken = await app.adminToken()
    const list = await app.request('GET', '/api/admin/feedback', { token: adminToken })
    assert.equal(list.status, 200)
    // Debería haber al menos el que acabamos de crear
    assert.ok(list.body.total >= 1)
  })

  // --- Pruebas de Migración ---
  test('migration: registering/migrating moves guest collection and rejects double transfer', async () => {
    // 1. Crear sesión de invitado
    const guest = await app.request('POST', '/api/guest/session')
    const guestToken = guest.body.token
    
    const { token } = await app.registerAndLogin('migrator')
    
    // 2. Ejecutar migración
    const migrate = await app.request('POST', '/api/guest/migrate', { token, guestToken })
    assert.equal(migrate.status, 200)

    // 3. Intentar migrar la misma sesión nuevamente (debe fallar 409)
    const migrate2 = await app.request('POST', '/api/guest/migrate', { token, guestToken })
    assert.equal(migrate2.status, 409)
  })

  // --- Pruebas de Administración ---
  test('admin: can change a user role and status; cannot block themselves', async () => {
    const adminToken = await app.adminToken()
    const { email } = await app.registerAndLogin('targetuser')
    const user = await app.models.User.findOne({ where: { email } })
    
    // 1. Administrador bloquea a un usuario
    const update = await app.request('PATCH', `/api/admin/users/${user.id}`, { token: adminToken, body: { status: 'blocked' } })
    assert.equal(update.status, 200)
    assert.equal(update.body.status, 'blocked')
    
    // 2. Administrador intenta bloquearse a sí mismo (debe fallar 403)
    const adminUser = await app.models.User.findOne({ where: { email: 'admin.test@example.test' } })
    const blockSelf = await app.request('PATCH', `/api/admin/users/${adminUser.id}`, { token: adminToken, body: { status: 'blocked' } })
    assert.equal(blockSelf.status, 403)
  })

  // --- PRUEBAS DE PUNTOS EXTRA ---
  test('Mejora Extra: El progreso ahora incluye un rango geológico (Gamificación)', async () => {
    // Usamos el helper de registro del profesor encapsulado en 'app'
    const { token } = await app.registerAndLogin('gamification_user')

    // Usamos el request custom del profesor
    const response = await app.request('GET', '/api/progress/me', { token })

    assert.equal(response.status, 200)
    assert.ok('rank' in response.body, 'La respuesta debe incluir el rango geológico')
    assert.equal(typeof response.body.rank, 'string')
  })

  test('Mejora Extra: La ruta de Fusión responde correctamente (Alquimia)', async () => {
    const { token } = await app.registerAndLogin('alchemy_user')

    const response = await app.request('POST', '/api/collection/fusion', { 
      token, 
      body: { rockId1: 1, rockId2: 2 } 
    })

    assert.equal(response.status, 200)
    assert.ok('success' in response.body)
  })

  after(async () => {
    if (app) await app.close()
  })
})