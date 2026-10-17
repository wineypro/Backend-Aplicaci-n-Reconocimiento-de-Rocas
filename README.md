# API de identificación de rocas

API REST desarrollada con **Node.js, Express, Sequelize y SQLite** para administrar un catálogo de rocas y sus clasificaciones, gestionar usuarios y roles, registrar reconocimientos recibidos desde un modelo externo o simulado, mantener colecciones personales y desbloquear logros.

> **Estado de la identificación:** este backend no clasifica imágenes por sí mismo. El endpoint de reconocimiento recibe los datos de un resultado (`rockId`, `confidence` y, opcionalmente, `imageUrl`) y aplica las reglas de registro, colección y logros.

## Tabla de contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Requisitos e instalación](#requisitos-e-instalación)
- [Configuración](#configuración)
- [Arquitectura](#arquitectura)
- [Ejecución y base de datos](#ejecución-y-base-de-datos)
- [Endpoints](#endpoints)
- [Autenticación y permisos](#autenticación-y-permisos)
- [Reconocimientos, invitados y logros](#reconocimientos-invitados-y-logros)
- [Formato de respuestas y errores](#formato-de-respuestas-y-errores)
- [Pruebas](#pruebas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Funcionalidades pendientes](#funcionalidades-pendientes)

## Características

- CRUD de rocas, tipos, categorías, roles, logros, análisis, colecciones, usuarios y asociaciones de logros.
- Búsqueda de rocas por texto, paginación y filtros por tipo, categoría y rango de dureza de Mohs.
- Registro e inicio de sesión con contraseñas protegidas mediante bcrypt y autenticación JWT.
- Control de acceso basado en roles, con operaciones administrativas restringidas.
- Sesiones temporales para invitados, con token aleatorio, expiración y límite de reconocimientos.
- Registro de reconocimientos y mantenimiento de una colección personal sin duplicar rocas.
- Desbloqueo automático de logros según condiciones configuradas.
- Inicialización de SQLite y carga de datos de demostración sin reemplazar los registros existentes.
- Pruebas automatizadas con `node:test`.

## Tecnologías

- **Node.js**: entorno de ejecución.
- **Express**: servidor HTTP y definición de rutas.
- **Sequelize**: ORM y gestión de modelos y asociaciones.
- **SQLite**: base de datos local.
- **JWT**: autenticación mediante tokens.
- **bcrypt**: hash de contraseñas.
- **node:test**: pruebas automatizadas.

## Requisitos e instalación

Se requiere una versión compatible de Node.js y npm.

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto y configura las variables indicadas en la sección siguiente.
3. Inicia la API:

   ```bash
   npm start
   ```

   Para desarrollo, si el proyecto tiene configurado ese script:

   ```bash
   npm run dev
   ```

4. Consulta el catálogo en `http://localhost:8080/api/rock`.
5. Ejecuta las pruebas con `npm test`.

El servidor comienza a escuchar únicamente después de autenticar la conexión y sincronizar los modelos con la base de datos.

## Configuración

### Variables de entorno

| Variable | Descripción | Valor local sugerido |
|---|---|---|
| `PORT` | Puerto HTTP del servidor. | `8080` |
| `DATABASE_NAME` | Nombre del archivo SQLite dentro de `src/database`. | `rock` |
| `JWT_SECRET` | Secreto utilizado para firmar y verificar los JWT. | Una cadena aleatoria privada |
| `JWT_EXPIRES_IN` | Tiempo de vigencia del JWT. | `1d` |
| `ADMIN_EMAIL` | Correo de la cuenta administradora inicial. | `admin@example.test` |
| `ADMIN_PASSWORD` | Contraseña de la cuenta administradora inicial. | Una contraseña propia y segura |
| `ADMIN_USERNAME` | Nombre de usuario de la cuenta administradora inicial. | `admin` |
| `GUEST_SESSION_TTL_HOURS` | Vigencia de una sesión de invitado, en horas. | `72` |

Ejemplo de `.env` para desarrollo:

```dotenv
PORT=8080
DATABASE_NAME=rock
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d
ADMIN_EMAIL=admin@example.test
ADMIN_PASSWORD=change-this-password
ADMIN_USERNAME=admin
GUEST_SESSION_TTL_HOURS=72
```

Los valores del ejemplo son ilustrativos. No publiques el archivo `.env` ni secretos reales en el repositorio. Se debe crear y mantener un `.env.example` sin credenciales reales.

En desarrollo, si no se especifican las credenciales de administración, el proyecto utiliza valores predeterminados documentados en el código. En producción, `ADMIN_PASSWORD` es obligatorio. El proceso de inicialización no sobrescribe una cuenta administradora existente. El secreto JWT predeterminado, si existe en la configuración, solo debe utilizarse para facilitar pruebas locales y debe sustituirse en despliegues.

## Arquitectura

El backend organiza las responsabilidades por capas:

`ruta → controlador → servicio → modelo → base de datos`

Una petición llega a Express y atraviesa los middlewares correspondientes. La ruta define el método HTTP y la URL; el controlador interpreta la entrada y construye la respuesta HTTP; el servicio concentra las reglas de negocio y las operaciones de persistencia; Sequelize utiliza los modelos y sus asociaciones para consultar o modificar SQLite. Los errores se delegan al middleware global para mantener un formato consistente.

| Capa o componente | Responsabilidad | Ejemplos |
|---|---|---|
| Servidor | Carga la configuración, conecta la base de datos y arranca la aplicación. | `src/server.js` |
| Aplicación | Configura Express, middlewares, rutas y manejadores de errores. | `src/app.js` |
| Configuración | Define la conexión con Sequelize y SQLite. | `src/config/database.js` |
| Modelos | Definen entidades, campos, validaciones y asociaciones. | `Rock`, `Category`, `Type`, `User` |
| Rutas | Relacionan métodos y URLs con controladores. | `src/routes/rock.route.js` |
| Controladores | Adaptan las peticiones y los resultados a respuestas HTTP. | `src/controllers/crud.controller.js` |
| Servicios | Implementan CRUD y reglas de negocio. | `src/services/crudService.js` |
| Middleware | Aplica tareas transversales, autenticación, autorización y manejo de errores. | `src/middlewares/` |
| Utilidades | Contienen lógica compartida para validar y preparar consultas. | `src/utils/queryOptions.js` |

Los controladores genéricos delegan los errores mediante `next(error)`. Las asociaciones entre modelos se registran en `src/models/index.js`.

## Ejecución y base de datos

Por defecto, SQLite utiliza el archivo `src/database/rock.sqlite`. La variable `DATABASE_NAME` cambia el nombre del archivo dentro de esa carpeta; el nombre solo admite letras, números, guiones y guiones bajos.

Durante el arranque, el servidor:

1. Carga las variables de entorno.
2. Autentica la conexión con Sequelize.
3. Sincroniza los modelos.
4. Carga los datos de demostración que falten.
5. Inicia el servidor HTTP.

No se utiliza `force: true` para borrar y recrear todas las tablas. Sin embargo, Sequelize no realiza automáticamente todas las migraciones de esquemas existentes. Si una base de datos antigua no contiene las nuevas columnas o tablas, utiliza una base nueva o sigue el procedimiento de migración definido por el proyecto. Conserva una copia si necesitas mantener los datos anteriores.

El seeder puede crear datos iniciales para tipos, categorías, roles, logros, rocas de ejemplo y la cuenta administradora. Está diseñado para evitar duplicar ejemplos en reinicios y no reemplazar valores que ya se hayan editado.

## Endpoints

La mayoría de los recursos CRUD genéricos ofrece:

- `GET /`: lista recursos.
- `POST /`: crea un recurso.
- `GET /:id`: consulta un recurso por identificador.
- `PATCH /:id`: actualiza un recurso.
- `DELETE /:id`: elimina un recurso.

El listado utiliza la forma `{ "items": [], "total": 0, "page": 1, "limit": 20 }`. Una eliminación correcta responde `204 No Content`. Los modelos configurados con `paranoid: true` utilizan borrado lógico.

### Recursos generales

La base de rutas documentada para los recursos es:

| Recurso | Prefijo | Descripción |
|---|---|---|
| Rocas | `/api/rock` | Catálogo, búsqueda y filtros de rocas. |
| Categorías | `/api/category` | Clasificación de las rocas. |
| Tipos | `/api/type` | Tipos asociados a las rocas. |
| Roles | `/api/role` | Roles del sistema. |
| Logros | `/api/achievement` | Definición y configuración de logros. |
| Análisis | `/api/analysis` | Registros de reconocimientos asociados a usuarios o sesiones. |
| Colecciones | `/api/collection` | Asociación entre usuarios y rocas descubiertas. |
| Logros de usuario | `/api/user-achievement` | Asociación entre usuarios y logros desbloqueados. |
| Usuarios | `/api/user` | Registro, inicio de sesión, perfil propio y consultas administrativas. |

Los permisos concretos dependen de la ruta. Consulta [Autenticación y permisos](#autenticación-y-permisos).

### Paginación y búsqueda

Los listados admiten los parámetros siguientes:

- `page`: página solicitada, desde `1`.
- `limit`: cantidad de resultados; por defecto `20` y máximo `100`.
- `search`: texto que se desea buscar.
- `searchBy`: campo permitido por el recurso para realizar la búsqueda.

Ejemplo:

```http
GET /api/rock?search=basalto&searchBy=name&page=1&limit=10
```

Solo se permiten los campos de búsqueda configurados para cada recurso.

### Filtros del catálogo

| Endpoint | Función |
|---|---|
| `GET /api/rock?typeId=1&categoryId=2` | Filtra por tipo y/o categoría; puede combinarse con búsqueda y paginación. |
| `GET /api/type/:id/rocks` | Lista las rocas de un tipo. |
| `GET /api/category/:id/rocks` | Lista las rocas de una categoría. |
| `GET /api/rock/identificar?q=oscuro` | Busca coincidencias de texto en propiedades de las rocas. |
| `GET /api/rock/dureza?min=5&max=7` | Busca rocas dentro de un rango de dureza de Mohs, inclusive. |

Los identificadores de tipo y categoría deben ser enteros positivos. Si un tipo o categoría no existe, los endpoints relacionados responden `404`. No se permite eliminar un tipo o categoría que tenga rocas asociadas; en ese caso se responde `409`.

Las validaciones del catálogo incluyen campos obligatorios, referencias existentes, dureza entre `1` y `10` y unicidad de `scientificName` e `index`. Los nombres de tipos y categorías también son únicos. Las escrituras del catálogo requieren el rol `Admin`.

El endpoint `/api/rock/identificar` realiza una búsqueda textual parcial en propiedades del catálogo. Es una ayuda de búsqueda educativa; **no identifica muestras ni infiere minerales mediante inteligencia artificial**.

Ejemplo de búsqueda por dureza:

```bash
curl "http://localhost:8080/api/rock/dureza?min=5&max=7"
```

Ejemplo de respuesta:

```json
{
  "min": 5,
  "max": 7,
  "total": 1,
  "rocks": [
    {
      "id": 1,
      "name": "Basalto",
      "hardness": 6
    }
  ]
}
```

El contenido exacto y la cantidad de resultados dependen de los datos de la base de datos. Los parámetros `min` y `max` son obligatorios, numéricos y no negativos. Si falta uno, los valores no son válidos o `min > max`, la API responde `400`.

### Ejemplo de una roca

Los campos disponibles dependen del modelo y de las validaciones definidas en el proyecto. Un ejemplo de cuerpo de solicitud es:

```json
{
  "name": "Basalto",
  "scientificName": "Basalt",
  "typeId": 1,
  "categoryId": 1,
  "index": 10,
  "composition": "Plagioclasa y piroxeno",
  "formula": "Variable",
  "environment": "Volcánico",
  "commonUses": "Construcción",
  "hardness": 6,
  "streak": "Gris",
  "color": "Oscuro",
  "texture": "Afanítica",
  "density": 2.9,
  "transparency": 0,
  "tenacity": 1,
  "imgUrl": "https://example.org/basalt.jpg",
  "mindatUrl": "https://www.mindat.org/"
}
```

Los identificadores referenciales deben existir y solo se aceptan los campos permitidos por el catálogo.

### Registro, inicio de sesión y perfil

| Método y endpoint | Acceso | Función |
|---|---|---|
| `POST /api/user/registro` | Público | Registra una cuenta. |
| `POST /api/user/login` | Público | Valida las credenciales y devuelve un JWT. |
| `GET /api/user/me` | Usuario autenticado | Consulta el perfil propio. |
| `PATCH /api/user/me` | Usuario autenticado | Actualiza los campos permitidos del perfil. |
| `GET /api/user` | Admin | Lista usuarios. |
| `GET /api/user/:id` | Admin | Consulta un usuario por identificador. |

Para el registro se requieren `userName`, `email` y `password`; la contraseña debe tener al menos ocho caracteres y `phone` es opcional. La contraseña se almacena como hash con bcrypt. El rol inicial lo establece el servidor: se ignora un `roleId` enviado por el cliente para evitar que alguien se asigne privilegios. El perfil propio solo permite editar `userName` y `phone`; no permite modificar el rol ni el estado de la cuenta.

Las cuentas bloqueadas (`status: "blocked"`) no pueden iniciar sesión. El modelo `User` elimina el campo `password` de la representación JSON.

### Sesiones de invitados, reconocimientos y colección

| Método y endpoint | Acceso | Función |
|---|---|---|
| `POST /api/guest/session` | Público | Crea una sesión temporal de invitado. |
| `GET /api/guest/session` | Token de invitado | Consulta el estado y el límite restante. |
| `POST /api/recognition` | Invitado o usuario autenticado | Registra un resultado de reconocimiento. |
| `GET /api/collection/me` | Usuario autenticado | Consulta la colección propia. |
| `GET /api/collection/me/:rockId` | Usuario autenticado | Consulta una roca de la colección propia. |

Para invitados, el token se envía mediante `X-Guest-Token`. Para usuarios registrados, se utiliza `Authorization: Bearer <TOKEN>`.

Ejemplo de creación de sesión y registro de reconocimiento:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/guest/session | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

curl -X POST http://localhost:8080/api/recognition \
  -H "Content-Type: application/json" \
  -H "X-Guest-Token: $TOKEN" \
  -d '{ "rockId": 1, "confidence": 92, "imageUrl": "https://example.org/photo.jpg" }'
```

El endpoint de reconocimiento recibe un resultado en JSON; no procesa una imagen ni ejecuta un modelo de clasificación dentro de este backend. La respuesta puede incluir el análisis registrado, el estado de la colección, si es un nuevo descubrimiento, los logros desbloqueados y el estado de la sesión de invitado.

Reglas de negocio:

- Una sesión de invitado permite hasta **10 reconocimientos válidos por sesión**. El límite no es por persona.
- Al superar el límite, el siguiente intento responde `403` con el código `GUEST_LIMIT_REACHED`.
- Los intentos inválidos no consumen el límite.
- Las sesiones expiran según `GUEST_SESSION_TTL_HOURS`; la base de datos almacena el hash SHA-256 del token, no el token en texto plano.
- Los usuarios autenticados no tienen ese límite de reconocimientos.
- Descubrir nuevamente una roca no crea una entrada duplicada en la colección: aumenta `recognitionCount` y conserva `firstDiscoveredAt`.

### Logros automáticos

Los logros se definen mediante `conditionType` y `conditionValue`. El servicio de logros evita desbloquear dos veces el mismo logro para un mismo propietario y registra la fecha `unlockedAt`.

| Slug | Condición documentada |
|---|---|
| `first-discovery` | Descubrir una roca distinta. |
| `rock-explorer` | Descubrir tres rocas distintas. |
| `dedicated-identifier` | Registrar diez reconocimientos. |

Un administrador puede desactivar un logro mediante `PATCH /api/achievement/:id`, por ejemplo con el cuerpo `{ "isActive": false }`.

### Claves compuestas de logros de usuario

`UserAchievement` utiliza la clave primaria compuesta `(userId, achievementId)`. Para consultar, actualizar o eliminar una asociación específica se necesitan ambos identificadores:

- `GET /api/user-achievement/:userId/:achievementId`
- `PATCH /api/user-achievement/:userId/:achievementId`
- `DELETE /api/user-achievement/:userId/:achievementId`

La creación y el listado utilizan `POST /api/user-achievement` y `GET /api/user-achievement`. Por ejemplo, `GET /api/user-achievement/7/3` consulta el logro `3` del usuario `7`. La actualización no puede cambiar la identidad de la asociación; únicamente permite modificar los campos expresamente autorizados, como `rockId` según la implementación documentada.

## Autenticación y permisos

El middleware `src/middlewares/validateToken.js` valida tokens Bearer, comprueba firma y vencimiento, verifica la existencia y el estado activo del usuario y carga su rol. Su variante `validateToken.optional` permite que ciertas rutas admitan solicitudes anónimas. `src/middlewares/authorizeRoles.js` permite restringir rutas por rol; `src/middlewares/guards.js` exporta las cadenas `adminOnly` y `authenticated`.

| Recurso u operación | Anónimo / invitado | Usuario autenticado | Admin |
|---|---|---|---|
| Lectura del catálogo (`rock`, `type`, `category`, `achievement`) | Permitida | Permitida | Permitida |
| Escritura del catálogo | `401` | `403` | Permitida |
| `POST /api/recognition` | Permitida, con límite por sesión invitada | Permitida, sin ese límite | Permitida |
| `GET /api/collection/me` | `401` | Solo la propia | Solo su propia colección mediante esta ruta |
| CRUD directo de `role`, `analysis`, `collection` y `user-achievement` | `401` | `403` | Permitido |
| Listado de usuarios (`/api/user`) | `401` | `403` | Permitido |

Esta matriz resume el comportamiento descrito en el proyecto; la configuración específica de cada ruta es la fuente definitiva de permisos.

## Formato de respuestas y errores

Los endpoints utilizan códigos HTTP para indicar el resultado de una solicitud:

| Código | Significado |
|---|---|
| `200` | Consulta o modificación correcta. |
| `201` | Recurso creado. |
| `204` | Eliminación correcta sin cuerpo de respuesta. |
| `400` | Datos, filtros, validaciones o referencias inválidas. |
| `401` | Falta autenticación o el token es inválido o ha vencido. |
| `403` | El usuario no tiene permisos o alcanzó un límite de uso. |
| `404` | No existe el recurso o la ruta solicitada. |
| `409` | Conflicto, como un registro duplicado o una eliminación no permitida por relaciones existentes. |
| `500` | Error interno no esperado. |
| `501` | Funcionalidad pendiente de implementación, cuando se usa el andamiaje correspondiente. |

Los errores de validación y unicidad de Sequelize se convierten en respuestas `400`; los controladores delegan los errores al middleware global.

## Suite de pruebas automatizadas

Ejecuta la suite completa con:

```bash
npm test
```

La suite utiliza `node:test` y `test/helpers/testApp.js` para levantar la aplicación con una base de datos SQLite temporal. Los antiguos casos pendientes (`test.todo`) de la cátedra fueron convertidos en pruebas funcionales, de modo que las funcionalidades implementadas se verifican mediante solicitudes HTTP y comprobaciones de sus respuestas y efectos en la base de datos.

La cobertura incluye:

- **CRUD y consultas:** creación, lectura, actualización y eliminación; registros inexistentes; campos inmutables; validación de datos; paginación, búsqueda y límites de resultados.
- **Catálogo y taxonomía:** filtros por tipo y categoría, consulta de rocas asociadas a tipos y categorías, validaciones de referencias y búsqueda por rango de dureza de Mohs, incluidos los límites inclusivos y los parámetros inválidos.
- **Autenticación y autorización:** registro, inicio de sesión, JWT, contraseñas protegidas con bcrypt, cuentas bloqueadas, perfil propio, roles y restricciones de acceso para operaciones administrativas.
- **Sesiones de invitados:** creación y consulta de sesiones temporales, expiración y límite de reconocimientos por sesión.
- **Reconocimientos y colecciones:** registro del resultado recibido, historial, transacciones, descubrimientos nuevos, actualización del contador al reconocer una roca repetida y prevención de duplicados en la colección.
- **Progreso y estadísticas personales:** consulta del progreso, historial de reconocimientos y métricas de descubrimiento de rocas.
- **Logros:** desbloqueo automático de logros como `first-discovery`, `rock-explorer` y `dedicated-identifier`, prevención de duplicados y registro de la fecha de desbloqueo.
- **Feedback:** creación, consulta y actualización de comentarios vinculados a reconocimientos, con comprobación de que la operación corresponda al usuario propietario.
- **Migración de invitados:** transferencia de colecciones y logros a una cuenta autenticada, invalidación de la sesión temporal y prevención de transferencias repetidas.
- **Administración:** verificación de permisos `adminOnly` para estadísticas globales, consulta administrativa de reconocimientos y feedback, gestión del estado de las cuentas y acceso a los datos de otros usuarios.
- **Claves compuestas:** operaciones sobre `UserAchievement` identificando el registro mediante `userId` y `achievementId`.
- **Errores y transacciones:** respuestas HTTP adecuadas ante datos inválidos, falta de permisos, recursos inexistentes y conflictos; comprobación de que las operaciones relacionadas mantengan la consistencia de los datos.

Las pruebas de reconocimiento no implican que este backend clasifique imágenes por sí mismo: el flujo documentado recibe un resultado simulado del modelo y comprueba cómo se registra y procesa.

## Estructura del proyecto

```text
src/
├── app.js
├── server.js
├── config/
│   └── database.js
├── controllers/
├── database/
│   ├── seedAdmin.js
│   └── seedDemoData.js
├── middlewares/
│   ├── validateToken.js
│   ├── authorizeRoles.js
│   └── guards.js
├── models/
│   └── index.js
├── routes/
│   ├── crud.route.js
│   ├── rock.route.js
│   └── taxonomy.route.js
├── services/
│   ├── crudService.js
│   ├── rockService.js
│   ├── recognitionService.js
│   ├── guestSessionService.js
│   ├── collectionService.js
│   └── achievementService.js
└── utils/
    └── queryOptions.js

test/
├── helpers/
│   └── testApp.js
├── auth.test.js
├── rockHardness.test.js
└── pruebas de progreso, logros, feedback, migración y administración
```

Esta estructura resume los archivos mencionados en la documentación; puede haber otros archivos y pruebas en el repositorio.

## Funcionalidades implementadas y estado del proyecto

Las funcionalidades que anteriormente estaban representadas por `test.todo` fueron implementadas y cuentan con pruebas funcionales, de acuerdo con los cambios del proyecto. Entre ellas se encuentran:

- [x] Progreso y estadísticas individuales: `GET /api/progress/me`.
- [x] Historial de reconocimientos: `GET /api/progress/me/history`.
- [x] Consulta de logros propios, bloqueados y desbloqueados: `GET /api/achievement/me`.
- [x] Feedback asociado a reconocimientos, con operaciones de creación, consulta y actualización y validación de propiedad.
- [x] Migración de colecciones y logros de una sesión de invitado a una cuenta, con invalidación del token temporal y prevención de doble transferencia.
- [x] Administración de usuarios, incluyendo control de rol y estado de cuenta.
- [x] Estadísticas globales: `GET /api/admin/stats`.
- [x] Consulta administrativa del historial de reconocimientos y feedback.
- [x] Consulta administrativa de las colecciones y los logros de usuarios.
- [x] Pruebas automatizadas para los flujos anteriores, además de las pruebas de catálogo, autenticación, permisos, dureza, claves compuestas y transacciones.

Para comprobar el estado actual del proyecto, ejecuta `npm test`. La suite debe finalizar correctamente; si una prueba falla, revisa el mensaje y el caso correspondiente antes de considerar validada la versión.