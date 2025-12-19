# ✅ Checklist de Pruebas - Backend Donky

## Pre-requisitos

- [ ] MongoDB está corriendo y conectado
- [ ] Servidor backend está corriendo (`npm run dev`)
- [ ] El servidor responde en `http://localhost:4000`
- [ ] Postman está instalado y la colección importada

## Pruebas Básicas (Flujo Completo)

### 1. Health Check
- [ ] `GET /` retorna status 200 con mensaje de éxito

### 2. Configuración del Taller (IMPORTANTE para crear turnos)
- [ ] `GET /api/taller` - Puede obtener configuración (puede estar vacía)
- [ ] `POST /api/taller` - Crear configuración con horarios y días laborales

**Ejemplo mínimo:**
```json
{
    "horarioApertura": "09:00",
    "horarioCierre": "18:00",
    "diasLaborales": ["lunes", "martes", "miercoles", "jueves", "viernes"]
}
```

### 3. Autenticación
- [ ] `POST /api/auth/register` - Registra usuario exitosamente
- [ ] `POST /api/auth/login` - Obtiene token de autenticación

### 4. CRUD Clientes
- [ ] `POST /api/clientes` - Crear cliente
- [ ] `GET /api/clientes` - Listar clientes
- [ ] `GET /api/clientes/:id` - Obtener cliente por ID
- [ ] `PATCH /api/clientes/:id` - Actualizar cliente
- [ ] `PATCH /api/clientes/:id/block` - Bloquear notificaciones
- [ ] `PATCH /api/clientes/:id/unblock` - Desbloquear notificaciones

### 5. CRUD Vehículos
- [ ] `POST /api/vehiculos` - Crear vehículo (requiere cliente_id)
- [ ] `GET /api/vehiculos` - Listar vehículos
- [ ] `GET /api/vehiculos/:id` - Obtener vehículo por ID
- [ ] `GET /api/vehiculos/:patente/historial` - Historial por patente
- [ ] `PATCH /api/vehiculos/:id` - Actualizar vehículo

### 6. CRUD Turnos (Más Complejo)
- [ ] `POST /api/turnos` - Crear turno (requiere cliente_id, vehiculo_id, fecha válida)
- [ ] `GET /api/turnos/pendientes` - Listar turnos pendientes
- [ ] `GET /api/turnos` - Listar todos los turnos
- [ ] `GET /api/turnos/:id` - Obtener turno por ID
- [ ] `PATCH /api/turnos/:id/aprobar` - Aprobar turno
- [ ] `PATCH /api/turnos/:id/rechazar` - Rechazar turno
- [ ] `PATCH /api/turnos/:id/cancelar` - Cancelar turno
- [ ] `PATCH /api/turnos/:id` - Actualizar turno

## Validaciones Específicas a Probar

### Validaciones de Cliente
- [ ] Email único - Intentar crear cliente con email duplicado debe retornar 409
- [ ] Campos obligatorios - Crear sin nombre o email debe retornar 400

### Validaciones de Vehículo
- [ ] Patente única - Intentar crear vehículo con patente duplicada debe retornar 409
- [ ] Patente formato argentino - Patente inválida debe retornar error de validación
- [ ] Cliente existe - Crear vehículo con cliente_id inexistente debe retornar 404

### Validaciones de Turno
- [ ] Horario válido - Crear turno fuera del horario de atención debe retornar 409
- [ ] Día laboral - Crear turno en día no laboral debe retornar 409
- [ ] Sin solapamiento - Crear turno que solape con otro debe retornar 409
- [ ] Fecha válida - Fecha en el pasado o formato inválido debe retornar error

## Casos de Error

- [ ] 404 - Recursos inexistentes
- [ ] 400 - Datos inválidos
- [ ] 409 - Conflictos (duplicados, solapamientos, reglas de negocio)
- [ ] 500 - Manejo de errores internos

## Flujo Completo de Ejemplo

1. ✅ Configurar taller
2. ✅ Crear cliente
3. ✅ Crear vehículo (asociado al cliente)
4. ✅ Crear turno (asociado a cliente y vehículo)
5. ✅ Aprobar turno
6. ✅ Listar turnos pendientes (no debe aparecer el aprobado)
7. ✅ Actualizar cliente
8. ✅ Actualizar vehículo
9. ✅ Listar vehículos por cliente

## Notas Importantes

- ⚠️ **Importante**: Configura el taller ANTES de crear turnos
- ⚠️ Las fechas deben estar en formato ISO 8601: `YYYY-MM-DDTHH:mm:ss`
- ⚠️ Las fechas se normalizan automáticamente al horario de Argentina
- ⚠️ Para eliminar clientes/vehículos con relaciones, usa `?force=true`
- ⚠️ Algunos endpoints guardan IDs automáticamente en variables de Postman para usar en requests siguientes

## Estado Final Esperado

Si todas las pruebas pasan, el backend está listo para:
- ✅ Integración con frontend
- ✅ Desarrollo de nuevas funcionalidades
- ✅ Pruebas de integración
- ✅ Despliegue a producción

