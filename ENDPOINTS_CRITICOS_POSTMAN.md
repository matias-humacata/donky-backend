# 🔍 Endpoints Críticos para Pruebas Pre-Deploy

Esta guía lista todos los endpoints críticos que DEBES probar en Postman antes del deploy a producción, en el orden correcto.

---

## 📦 Configuración Inicial en Postman

### 1. Importar Colección
1. Abre Postman
2. Click en **Import**
3. Selecciona `postman_collection.json`
4. La colección "Donky Backend API" aparecerá

### 2. Configurar Variables
1. Click derecho en la colección → **Edit**
2. Pestaña **Variables**
3. Configura `base_url` con tu URL de producción:
   - Desarrollo: `http://localhost:4000`
   - Producción: `https://tu-api.com` (o la URL de tu servidor)

---

## 🎯 ORDEN DE PRUEBAS (Seguir Este Orden)

### **FASE 1: Verificación Básica**

#### ✅ 1. Health Check
```
GET {{base_url}}/
```
**Esperado:**
- Status: `200 OK`
- Response: `{"status":"API del Taller Donking funcionando 🚗"}`
- ⚠️ Si falla: El servidor no está funcionando

---

### **FASE 2: Autenticación**

#### ✅ 2. Registrar Usuario
```
POST {{base_url}}/api/auth/register
Content-Type: application/json

{
    "nombre": "Usuario Prueba",
    "email": "prueba@test.com",
    "password": "password123"
}
```
**Esperado:**
- Status: `201 Created`
- Response: `{"message":"Usuario registrado"}`
- ⚠️ Si falla 409: El email ya existe (cambiar email)
- ⚠️ Si falla 400: Datos inválidos

#### ✅ 3. Login
```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
    "email": "prueba@test.com",
    "password": "password123"
}
```
**Esperado:**
- Status: `200 OK`
- Response: `{"token":"...","expiresIn":"24h"}`
- ✅ El token se guarda automáticamente en la variable `auth_token`
- ⚠️ Si falla 400: Credenciales incorrectas
- ⚠️ Si falla 500: JWT_SECRET no configurado

---

### **FASE 3: Configuración del Taller (OBLIGATORIO antes de crear turnos)**

#### ✅ 4. Configurar Taller
```
POST {{base_url}}/api/taller
Content-Type: application/json

{
    "horarioApertura": "09:00",
    "horarioCierre": "18:00",
    "diasLaborales": ["lunes", "martes", "miercoles", "jueves", "viernes"],
    "intervaloMinutos": 60,
    "diasNoLaborables": [],
    "vacaciones": []
}
```
**Esperado:**
- Status: `200 OK`
- Response: Objeto con la configuración guardada
- ⚠️ Si falla: Verificar formato de horarios (HH:mm)

#### ✅ 5. Obtener Configuración
```
GET {{base_url}}/api/taller
```
**Esperado:**
- Status: `200 OK`
- Response: Objeto con configuración o `{}` si no existe

---

### **FASE 4: Clientes**

#### ✅ 6. Crear Cliente
```
POST {{base_url}}/api/clientes
Content-Type: application/json

{
    "nombre": "Juan Pérez",
    "telefono": "+5491123456789"
}
```
**Esperado:**
- Status: `201 Created`
- Response: Cliente creado con `_id`
- ✅ Guardar `_id` manualmente como `cliente_id` en Postman

#### ✅ 7. Listar Clientes
```
GET {{base_url}}/api/clientes
```
**Esperado:**
- Status: `200 OK`
- Response: Array de clientes

#### ✅ 8. Obtener Cliente por ID
```
GET {{base_url}}/api/clientes/{{cliente_id}}
```
**Esperado:**
- Status: `200 OK`
- Response: Cliente con el `_id` especificado
- ⚠️ Si falla 404: ID no existe

---

### **FASE 5: Vehículos**

#### ✅ 9. Crear Vehículo
```
POST {{base_url}}/api/vehiculos
Content-Type: application/json

{
    "cliente": "{{cliente_id}}",
    "marca": "Ford",
    "modelo": "Fiesta",
    "patente": "ABC123",
    "anio": 2020,
    "kmActual": 50000
}
```
**Esperado:**
- Status: `201 Created`
- Response: `{"ok":true,"data":{...vehiculo...}}`
- ✅ Guardar `data._id` como `vehiculo_id`

#### ✅ 10. Listar Vehículos
```
GET {{base_url}}/api/vehiculos
```
**Esperado:**
- Status: `200 OK`
- Response: `{"data":[...],"meta":{"total":X,"page":1,"limit":20}}`

#### ✅ 11. Obtener Vehículo por ID
```
GET {{base_url}}/api/vehiculos/id/{{vehiculo_id}}
```
**Esperado:**
- Status: `200 OK`
- Response: Vehículo con relaciones pobladas

---

### **FASE 6: Turnos (LO MÁS CRÍTICO)**

#### ✅ 12. Crear Turno
```
POST {{base_url}}/api/turnos
Content-Type: application/json

{
    "cliente": "{{cliente_id}}",
    "vehiculo": "{{vehiculo_id}}",
    "fecha": "2024-12-20T10:00:00",
    "duracionMin": 60
}
```
**⚠️ IMPORTANTE:** 
- Usar una fecha FUTURA en formato ISO 8601
- La fecha debe estar en un día laboral
- Dentro del horario configurado (09:00-18:00)

**Esperado:**
- Status: `201 Created`
- Response: Turno creado con `estado: "pendiente"`
- ✅ Guardar `_id` como `turno_id`

**Posibles Errores:**
- `409`: Turno solapado, fuera de horario, o día no laboral
- `400`: Datos faltantes

#### ✅ 13. Listar Turnos Pendientes
```
GET {{base_url}}/api/turnos/pendientes
```
**Esperado:**
- Status: `200 OK`
- Response: Array de turnos con `estado: "pendiente"`

#### ✅ 14. Obtener Turno por ID
```
GET {{base_url}}/api/turnos/{{turno_id}}
```
**Esperado:**
- Status: `200 OK`
- Response: Turno con relaciones pobladas

#### ✅ 15. Aprobar Turno (Requiere Auth)
```
PATCH {{base_url}}/api/turnos/{{turno_id}}/aprobar
Authorization: Bearer {{auth_token}}
```
**Esperado:**
- Status: `200 OK`
- Response: Turno con `estado: "confirmado"`
- ⚠️ Requiere rol `taller` en el token

#### ✅ 16. Listar Todos los Turnos
```
GET {{base_url}}/api/turnos
```
**Esperado:**
- Status: `200 OK`
- Response: Array de turnos activos (pendiente/confirmado)

---

### **FASE 7: Autenticación y Roles**

#### ✅ 17. Probar Auth Requerido
```
PATCH {{base_url}}/api/turnos/{{turno_id}}/aprobar
(Sin header Authorization)
```
**Esperado:**
- Status: `401 Unauthorized`
- Response: `{"error":"Token no enviado"}`

#### ✅ 18. Probar Token Inválido
```
PATCH {{base_url}}/api/turnos/{{turno_id}}/aprobar
Authorization: Bearer token_invalido
```
**Esperado:**
- Status: `401 Unauthorized`
- Response: `{"error":"Token inválido o expirado"}`

---

### **FASE 8: Validaciones Críticas**

#### ✅ 19. Validar Email Duplicado
```
POST {{base_url}}/api/auth/register
Content-Type: application/json

{
    "nombre": "Otro Usuario",
    "email": "prueba@test.com",
    "password": "password123"
}
```
**Esperado:**
- Status: `409 Conflict`
- Response: `{"error":"El email ya está registrado"}`

#### ✅ 20. Validar Patente Duplicada
```
POST {{base_url}}/api/vehiculos
Content-Type: application/json

{
    "cliente": "{{cliente_id}}",
    "marca": "Toyota",
    "modelo": "Corolla",
    "patente": "ABC123"
}
```
**Esperado:**
- Status: `409 Conflict`
- Response: `{"error":"La patente ya está registrada"}`

#### ✅ 21. Validar Turno Solapado
```
POST {{base_url}}/api/turnos
Content-Type: application/json

{
    "cliente": "{{cliente_id}}",
    "vehiculo": "{{vehiculo_id}}",
    "fecha": "2024-12-20T10:30:00",
    "duracionMin": 60
}
```
**Esperado:**
- Status: `409 Conflict`
- Response: `{"error":"Ya existe un turno en ese horario"}`

#### ✅ 22. Validar Turno Fuera de Horario
```
POST {{base_url}}/api/turnos
Content-Type: application/json

{
    "cliente": "{{cliente_id}}",
    "vehiculo": "{{vehiculo_id}}",
    "fecha": "2024-12-20T07:00:00",
    "duracionMin": 60
}
```
**Esperado:**
- Status: `409 Conflict`
- Response: `{"error":"Horario fuera de atención"}`

---

### **FASE 9: Otros Endpoints**

#### ✅ 23. Métricas
```
GET {{base_url}}/api/metricas/resumen
```
**Esperado:**
- Status: `200 OK`
- Response: `{"totalTurnos":X,"cancelaciones":{...},"tasaCancelacionPorcentaje":Y}`

#### ✅ 24. Recordatorios
```
GET {{base_url}}/api/recordatorios/mantenimientos
```
**Esperado:**
- Status: `200 OK`
- Response: `{"total":X,"recordatorios":[...]}`

---

## 📊 Checklist de Pruebas

### Básicas (Críticas)
- [ ] Health check funciona
- [ ] Register funciona
- [ ] Login funciona y genera token
- [ ] JWT_SECRET configurado correctamente

### Configuración
- [ ] Configurar taller funciona
- [ ] Obtener configuración funciona

### CRUD Clientes
- [ ] Crear cliente funciona
- [ ] Listar clientes funciona
- [ ] Obtener cliente por ID funciona
- [ ] Validación email duplicado funciona

### CRUD Vehículos
- [ ] Crear vehículo funciona
- [ ] Listar vehículos funciona
- [ ] Validación patente duplicada funciona

### Turnos (MÁS CRÍTICO)
- [ ] Crear turno funciona
- [ ] Validación horarios funciona
- [ ] Validación solapamiento funciona
- [ ] Aprobar turno funciona (con auth)
- [ ] Listar turnos funciona

### Seguridad
- [ ] Auth requerido funciona (401 sin token)
- [ ] Token inválido rechazado (401)
- [ ] CORS configurado (verificar en browser)

### Validaciones
- [ ] Email duplicado (409)
- [ ] Patente duplicada (409)
- [ ] Turno solapado (409)
- [ ] Turno fuera de horario (409)

---

## 🔧 Variables de Postman a Configurar Manualmente

Después de cada creación exitosa, guarda los IDs:

```
cliente_id = <_id del cliente creado>
vehiculo_id = <_id del vehículo creado>
turno_id = <_id del turno creado>
auth_token = <se guarda automáticamente en login>
```

**Para guardar manualmente:**
1. Click en el response
2. Click en la pestaña **Tests**
3. Agregar: `pm.environment.set("cliente_id", pm.response.json()._id);`

---

## ⚠️ Errores Comunes y Soluciones

### Error 500 - "Error interno del servidor"
- **Causa:** Error en el servidor
- **Solución:** Revisar logs del servidor
- **Verificar:** MongoDB conectado, variables de entorno configuradas

### Error 401 - "Token no enviado"
- **Causa:** Endpoint requiere autenticación
- **Solución:** Agregar header `Authorization: Bearer {{auth_token}}`

### Error 409 - "Ya existe..."
- **Causa:** Validación de duplicados funcionando
- **Solución:** Cambiar datos (email, patente, fecha de turno)
- **✅ Es correcto:** Significa que las validaciones funcionan

### Error 404 - "No encontrado"
- **Causa:** ID no existe o ruta incorrecta
- **Solución:** Verificar que el ID sea correcto, verificar ruta

---

## ✅ Criterios de Éxito

**El backend está listo para producción si:**

1. ✅ Todos los endpoints básicos responden correctamente
2. ✅ Autenticación funciona (register/login)
3. ✅ Validaciones funcionan (errores 409 correctos)
4. ✅ Seguridad funciona (errores 401 correctos)
5. ✅ No hay errores 500 inesperados
6. ✅ Health check responde
7. ✅ MongoDB conectado
8. ✅ CORS configurado (si pruebas desde browser)

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd")

