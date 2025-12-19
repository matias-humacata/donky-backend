# Guía de Pruebas con Postman - Backend Donky

Esta guía te ayudará a probar todos los endpoints del backend antes de comenzar con el desarrollo del frontend.

## 📦 Importar la Colección

1. Abre Postman
2. Click en **Import** (arriba a la izquierda)
3. Selecciona el archivo `postman_collection.json`
4. La colección "Donky Backend API" aparecerá en tu workspace

## ⚙️ Configuración Inicial

### Variables de Entorno

La colección usa la variable `base_url` que por defecto es `http://localhost:4000`. Asegúrate de que tu servidor esté corriendo en ese puerto.

Para cambiar el puerto:
1. Click derecho en la colección → **Edit**
2. Ve a la pestaña **Variables**
3. Modifica `base_url` si es necesario

## 🔄 Orden Recomendado de Pruebas

### 1. Health Check
- **GET /** - Verificar que el servidor está funcionando

### 2. Autenticación
- **POST /api/auth/register** - Registrar un usuario de prueba
- **POST /api/auth/login** - Obtener token (se guarda automáticamente en variables)

### 3. Configuración del Taller
- **POST /api/taller** - Configurar horarios y días laborales (requerido para crear turnos)

### 4. Clientes
- **POST /api/clientes** - Crear cliente (se guarda `cliente_id`)
- **GET /api/clientes** - Listar todos los clientes
- **GET /api/clientes/:id** - Obtener cliente específico
- **PATCH /api/clientes/:id** - Actualizar cliente
- **PATCH /api/clientes/:id/block** - Bloquear notificaciones
- **PATCH /api/clientes/:id/unblock** - Desbloquear notificaciones

### 5. Vehículos
- **POST /api/vehiculos** - Crear vehículo (necesita `cliente_id`, se guarda `vehiculo_id`)
- **GET /api/vehiculos** - Listar vehículos (con filtros opcionales)
- **GET /api/vehiculos/:id** - Obtener vehículo específico
- **GET /api/vehiculos/:patente/historial** - Historial por patente
- **PATCH /api/vehiculos/:id** - Actualizar vehículo

### 6. Turnos
- **POST /api/turnos** - Crear turno (necesita `cliente_id` y `vehiculo_id`, se guarda `turno_id`)
- **GET /api/turnos/pendientes** - Listar turnos pendientes
- **GET /api/turnos** - Listar todos los turnos (con filtros opcionales)
- **GET /api/turnos/:id** - Obtener turno específico
- **PATCH /api/turnos/:id/aprobar** - Aprobar turno
- **PATCH /api/turnos/:id/rechazar** - Rechazar turno
- **PATCH /api/turnos/:id/cancelar** - Cancelar turno
- **PATCH /api/turnos/:id** - Actualizar turno (fecha, duración, vehículo)

## 📝 Ejemplos de Datos de Prueba

### Crear Cliente
```json
{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "+5491123456789"
}
```

### Crear Vehículo
```json
{
    "cliente": "{{cliente_id}}",
    "marca": "Ford",
    "modelo": "Fiesta",
    "patente": "ABC123",
    "kmActual": 50000
}
```

### Crear Turno
```json
{
    "cliente": "{{cliente_id}}",
    "vehiculo": "{{vehiculo_id}}",
    "fecha": "2024-12-20T10:00:00",
    "duracionMin": 60
}
```

**Nota:** La fecha debe estar en formato ISO 8601. El backend la normaliza automáticamente al horario de Argentina.

### Configurar Taller
```json
{
    "horarioApertura": "09:00",
    "horarioCierre": "18:00",
    "diasLaborales": ["lunes", "martes", "miercoles", "jueves", "viernes"],
    "diasNoLaborables": [],
    "vacaciones": []
}
```

## ✅ Validaciones Importantes a Probar

### Clientes
- ✅ Email debe ser único
- ✅ Nombre y email son obligatorios
- ✅ Email se normaliza a minúsculas automáticamente

### Vehículos
- ✅ Patente debe ser única
- ✅ Patente debe cumplir formato argentino (ABC123 o ABC123DE)
- ✅ Cliente debe existir
- ✅ No se puede eliminar vehículo con turnos futuros (a menos que uses `?force=true`)

### Turnos
- ✅ No se puede crear turno fuera del horario de atención
- ✅ No se puede crear turno en días no laborales
- ✅ No se puede crear turno en días de vacaciones
- ✅ No se puede crear turno que solape con otro existente
- ✅ Fecha se normaliza al horario de Argentina

## 🔍 Códigos de Estado HTTP Esperados

- **200** - OK (operación exitosa)
- **201** - Created (recurso creado)
- **400** - Bad Request (datos inválidos)
- **404** - Not Found (recurso no encontrado)
- **409** - Conflict (violación de reglas de negocio, ej: turno solapado, email duplicado)
- **500** - Internal Server Error

## 🎯 Tips para las Pruebas

1. **Variables Automáticas**: Algunas requests guardan automáticamente IDs en variables (cliente_id, vehiculo_id, turno_id) para usar en requests siguientes.

2. **Fechas**: Usa fechas futuras para los turnos. El formato debe ser ISO 8601: `YYYY-MM-DDTHH:mm:ss`

3. **Configuración del Taller**: Asegúrate de configurar el taller ANTES de crear turnos, o recibirás errores de validación.

4. **Eliminación en Cascada**: Para eliminar clientes o vehículos con relaciones, usa `?force=true` en el query string.

5. **Filtros**: Muchos endpoints GET aceptan query parameters para filtrar (page, limit, estado, cliente, etc.)

## 🐛 Solución de Problemas

### Error 404 en todas las rutas
- Verifica que el servidor esté corriendo
- Verifica que `base_url` esté configurado correctamente

### Error 500
- Revisa la consola del servidor para ver el error específico
- Verifica que MongoDB esté conectado

### Error 409 al crear turno
- Verifica la configuración del taller (horarios, días laborales)
- Asegúrate de que la fecha no solape con otro turno existente
- Verifica que la fecha esté dentro del horario de atención

### Variables no se guardan
- Algunas requests tienen scripts de test que guardan IDs automáticamente
- Verifica que los scripts estén habilitados en la configuración de Postman

## 📚 Endpoints Disponibles

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión

### Clientes
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Crear cliente
- `GET /api/clientes/:id` - Obtener cliente
- `PATCH /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente
- `PATCH /api/clientes/:id/block` - Bloquear notificaciones
- `PATCH /api/clientes/:id/unblock` - Desbloquear notificaciones

### Vehículos
- `GET /api/vehiculos` - Listar vehículos
- `POST /api/vehiculos` - Crear vehículo
- `GET /api/vehiculos/:id` - Obtener vehículo
- `GET /api/vehiculos/:patente/historial` - Historial por patente
- `PATCH /api/vehiculos/:id` - Actualizar vehículo
- `DELETE /api/vehiculos/:id` - Eliminar vehículo

### Turnos
- `GET /api/turnos` - Listar turnos
- `GET /api/turnos/pendientes` - Listar turnos pendientes
- `POST /api/turnos` - Crear turno
- `GET /api/turnos/:id` - Obtener turno
- `PATCH /api/turnos/:id` - Actualizar turno
- `PATCH /api/turnos/:id/aprobar` - Aprobar turno
- `PATCH /api/turnos/:id/rechazar` - Rechazar turno
- `PATCH /api/turnos/:id/cancelar` - Cancelar turno

### Configuración Taller
- `GET /api/taller` - Obtener configuración
- `POST /api/taller` - Crear/actualizar configuración
- `DELETE /api/taller/diasNoLaborables/:fecha` - Eliminar día no laborable
- `DELETE /api/taller/vacaciones/:inicio/:fin` - Eliminar vacaciones

