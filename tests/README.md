# 🧪 Testing Suite - Taller Donky Backend

Sistema completo de testing para el backend del Taller Donky.

## 📁 Estructura

```
tests/
├── setup/
│   ├── db.js              # Conexión y helpers de DB
│   ├── globalSetup.js     # Setup global (MongoDB Memory Server)
│   └── globalTeardown.js  # Teardown global
├── seeds/
│   ├── seed.js            # Script de seed masivo
│   └── seedHelpers.js     # Funciones de generación de datos
├── integration/
│   ├── clientes.test.js   # Tests API Clientes
│   ├── vehiculos.test.js  # Tests API Vehículos
│   ├── turnos.test.js     # Tests API Turnos
│   └── flujos.test.js     # Tests de flujos E2E
└── load/
    └── k6-config.js       # Configuración pruebas de carga
```

---

## 🚀 Comandos Rápidos

### Tests de Integración

```bash
# Ejecutar todos los tests
npm test

# Watch mode (desarrollo)
npm run test:watch

# Con coverage
npm run test:coverage

# Solo tests de integración
npm run test:integration
```

### Seed de Datos

```bash
# Seed completo (200 clientes, 400+ vehículos, 200 turnos)
npm run seed

# Seed con limpieza previa
npm run seed:clear

# Seed pequeño (20 clientes)
npm run seed:small

# Seed personalizado
node tests/seeds/seed.js --clientes 50
```

### Pruebas de Carga (requiere k6)

```bash
# Instalar k6
# Windows: choco install k6
# Mac: brew install k6
# Linux: sudo apt install k6

# Smoke test (verificación rápida)
npm run test:load:smoke

# Load test (carga normal)
npm run test:load:full

# Stress test (encontrar límites)
npm run test:load:stress
```

---

## 📊 Seed de Datos

El script de seed genera datos coherentes y realistas:

| Entidad | Cantidad | Detalles |
|---------|----------|----------|
| **Clientes** | 200 | 180 activos, 20 en papelera |
| **Vehículos** | 400-600 | 2-3 por cliente, patentes argentinas |
| **Turnos** | 200 | Pasados/futuros, varios estados |
| **Auditorías** | ~150 | Generadas automáticamente |

### Características:

- ✅ Patentes formato argentino (viejo: ABC123, nuevo: AB123CD)
- ✅ Teléfonos argentinos válidos
- ✅ Marcas y modelos reales comunes en Argentina
- ✅ KM coherente con el año del vehículo
- ✅ Turnos en horarios laborales válidos
- ✅ Distribución realista de estados

---

## 🧪 Tests de Integración

### Cobertura

| Módulo | Tests | Escenarios Cubiertos |
|--------|-------|----------------------|
| **Clientes** | 15+ | CRUD, soft delete, restauración, bloqueo WhatsApp |
| **Vehículos** | 20+ | CRUD, búsqueda por patente, huérfanos |
| **Turnos** | 25+ | Creación, validaciones, transiciones de estado |
| **Flujos E2E** | 10+ | Alta completa, cascada, integridad referencial |

### Flujos Críticos Probados

1. **Alta Completa**: Cliente → Vehículo → Turno → Aprobar
2. **Soft Delete + Restauración**: Cascada cliente-vehículos
3. **Validaciones de Turno**: Horario, solapamiento, capacidad
4. **Máquina de Estados**: Transiciones válidas/inválidas
5. **Integridad Referencial**: Vehículo de otro cliente, IDs inexistentes
6. **Configuración Dinámica**: Capacidad por día de semana

---

## 🚦 Pruebas de Carga

### Escenarios Disponibles

| Escenario | VUs | Duración | Uso |
|-----------|-----|----------|-----|
| **smoke** | 5 | 30s | Verificación rápida |
| **load** | 20→50 | 5min | Carga normal |
| **stress** | 30→100 | 3min | Encontrar límites |
| **spike** | 10→200 | 1min | Picos repentinos |

### Thresholds (Criterios de Éxito)

- ✅ p95 latencia < 500ms
- ✅ Error rate < 1%
- ✅ Creación de turno < 1s
- ✅ Búsquedas < 300ms

### Métricas Personalizadas

- `turno_creation_time`: Tiempo de creación de turno
- `search_time`: Tiempo de búsquedas
- `turnos_creados`: Contador de turnos creados
- `errors`: Tasa de errores

---

## ⚙️ Configuración

### Variables de Entorno para Testing

Crear archivo `.env.test`:

```env
MONGO_URI=mongodb://localhost:27017/donky_test
PORT=4001
NODE_ENV=test
JWT_SECRET=test_secret_key
```

### MongoDB Memory Server

Los tests usan MongoDB en memoria automáticamente.
No requiere instalación de MongoDB local.

---

## 📝 Escribir Nuevos Tests

### Ejemplo de Test de Integración

```javascript
const request = require('supertest');
const app = require('../../src/app');

describe('Mi Nuevo Test', () => {
  
  beforeEach(async () => {
    // Setup: crear datos necesarios
    await global.testHelpers.crearConfiguracion();
  });
  
  it('debería hacer algo específico', async () => {
    const res = await request(app)
      .post('/api/endpoint')
      .send({ dato: 'valor' })
      .expect(201);
    
    expect(res.body).toHaveProperty('id');
  });
  
});
```

### Helpers Disponibles

```javascript
// En tests/setup/db.js
global.testHelpers = {
  crearConfiguracion(overrides),
  crearCliente(overrides),
  crearVehiculo(clienteId, overrides),
  crearTurno(clienteId, vehiculoId, overrides),
  crearSetupCompleto(),
  generarPatente()
};
```

---

## 🐛 Troubleshooting

### Error: "No existe la configuración del taller"

Asegúrate de crear la configuración en el `beforeEach`:

```javascript
beforeEach(async () => {
  await global.testHelpers.crearConfiguracion();
});
```

### Tests lentos

- Usa `--runInBand` para ejecutar en serie
- Verifica que MongoDB Memory Server esté funcionando

### k6 no encontrado

```bash
# Instalar k6
choco install k6  # Windows
brew install k6   # Mac
```

---

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

---

**Última actualización:** Marzo 2026




