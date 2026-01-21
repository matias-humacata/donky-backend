# 📋 Rutas Listas para Postman - Producción

Copia y pega estas rutas directamente en Postman para probar el backend en producción.

---

## 🚀 Configuración Rápida

**Variable de entorno en Postman:**
- Nombre: `base_url`
- Valor desarrollo: `http://localhost:4000`
- Valor producción: `https://tu-api.com` (cambiar por tu URL)

---

## ✅ ENDPOINTS CRÍTICOS (En Orden)

### 1. Health Check
```
GET {{base_url}}/
```

---

### 2. Registrar Usuario
```
POST {{base_url}}/api/auth/register
Content-Type: application/json

{
    "nombre": "Usuario Prueba",
    "email": "prueba@test.com",
    "password": "password123"
}
```

---

### 3. Login
```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
    "email": "prueba@test.com",
    "password": "password123"
}
```

---

### 4. Configurar Taller
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

---

### 5. Crear Cliente
```
POST {{base_url}}/api/clientes
Content-Type: application/json

{
    "nombre": "Juan Pérez",
    "telefono": "+5491123456789"
}
```

---

### 6. Listar Clientes
```
GET {{base_url}}/api/clientes
```

---

### 7. Obtener Cliente
```
GET {{base_url}}/api/clientes/{{cliente_id}}
```

---

### 8. Crear Vehículo
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

---

### 9. Listar Vehículos
```
GET {{base_url}}/api/vehiculos
```

---

### 10. Obtener Vehículo
```
GET {{base_url}}/api/vehiculos/id/{{vehiculo_id}}
```

---

### 11. Crear Turno
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
⚠️ **Cambiar fecha por una fecha FUTURA**

---

### 12. Listar Turnos Pendientes
```
GET {{base_url}}/api/turnos/pendientes
```

---

### 13. Obtener Turno
```
GET {{base_url}}/api/turnos/{{turno_id}}
```

---

### 14. Aprobar Turno (Requiere Auth)
```
PATCH {{base_url}}/api/turnos/{{turno_id}}/aprobar
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

---

### 15. Rechazar Turno (Requiere Auth)
```
PATCH {{base_url}}/api/turnos/{{turno_id}}/rechazar
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

---

### 16. Cancelar Turno (Requiere Auth)
```
PATCH {{base_url}}/api/turnos/{{turno_id}}/cancelar
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

---

### 17. Listar Todos los Turnos
```
GET {{base_url}}/api/turnos
```

---

### 18. Métricas
```
GET {{base_url}}/api/metricas/resumen
```

---

### 19. Recordatorios
```
GET {{base_url}}/api/recordatorios/mantenimientos
```

---

## 🔐 Endpoints que Requieren Autenticación

Agregar este header:
```
Authorization: Bearer {{auth_token}}
```

**Endpoints protegidos:**
- `PATCH /api/turnos/:id/aprobar` (requiere rol: taller)
- `PATCH /api/turnos/:id/rechazar` (requiere rol: taller)
- `PATCH /api/turnos/:id/cancelar` (requiere rol: cliente o taller)
- `GET /api/ordenes-trabajo`
- `POST /api/ordenes-trabajo`
- `PATCH /api/ordenes-trabajo/:id`

---

## ⚠️ Validaciones a Probar

### Email Duplicado (Debe dar 409)
```
POST {{base_url}}/api/auth/register
Content-Type: application/json

{
    "nombre": "Otro",
    "email": "prueba@test.com",
    "password": "password123"
}
```

### Patente Duplicada (Debe dar 409)
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

### Turno Solapado (Debe dar 409)
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

### Turno Fuera de Horario (Debe dar 409)
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

---

## 📝 Notas Importantes

1. **Reemplazar `{{base_url}}`** por tu URL de producción
2. **Reemplazar `{{cliente_id}}`**, `{{vehiculo_id}}`, `{{turno_id}}` con IDs reales
3. **`{{auth_token}}`** se guarda automáticamente después del login
4. **Fechas** deben ser FUTURAS y en formato ISO 8601: `YYYY-MM-DDTHH:mm:ss`
5. **Orden importante:** Configurar taller ANTES de crear turnos

---

## ✅ Checklist Rápido

- [ ] Health check OK (200)
- [ ] Register OK (201)
- [ ] Login OK (200, token generado)
- [ ] Configurar taller OK (200)
- [ ] Crear cliente OK (201)
- [ ] Crear vehículo OK (201)
- [ ] Crear turno OK (201)
- [ ] Aprobar turno OK (200, con auth)
- [ ] Validaciones funcionan (409 cuando corresponde)
- [ ] Auth funciona (401 sin token)

---

**Listo para copiar y pegar en Postman** ✅

