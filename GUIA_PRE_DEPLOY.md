# 🚀 Guía Pre-Deploy - Backend Donky

Esta guía te ayudará a configurar y probar el backend antes del despliegue a producción.

---

## 📋 PASO 1: Configurar Variables de Entorno para Producción

### Crear archivo `.env` en el servidor de producción

```env
# ============================================
# CONFIGURACIÓN PRODUCCIÓN - BACKEND DONKY
# ============================================

# ⚠️ OBLIGATORIAS
# ============================================

# URI de conexión a MongoDB (Producción)
# Ejemplo Atlas: mongodb+srv://usuario:password@cluster.mongodb.net/donky?retryWrites=true&w=majority
# Ejemplo local/remoto: mongodb://usuario:password@host:puerto/donky
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/donky

# Secret key para JWT tokens (GENERAR UNO NUEVO Y SEGURO)
# ⚠️ IMPORTANTE: No usar el mismo que en desarrollo
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=tu_secret_key_super_segura_de_produccion_aqui

# ============================================
# OBLIGATORIAS - CONFIGURACIÓN RECOMENDADA
# ============================================

# URL del frontend (para CORS)
# ⚠️ CRÍTICO: Cambiar por la URL real de tu frontend en producción
FRONTEND_URL=https://tudominio.com
# Ejemplo: FRONTEND_URL=https://app.donky.com.ar

# Entorno
NODE_ENV=production

# Puerto (ajustar según tu servidor)
PORT=4000
# O el puerto que use tu hosting (ej: Heroku usa process.env.PORT automáticamente)

# ============================================
# OPCIONALES
# ============================================

# Expiración de tokens JWT (default: 24h)
JWT_EXPIRES_IN=24h
# Recomendaciones:
# - Desarrollo: 24h
# - Producción: 8h o 12h para mayor seguridad

# Webhook de n8n (si lo usas)
N8N_WEBHOOK_APPROVAL=https://tun8n.com/webhook/aprobar-turno

# Zona horaria (ya configurada por defecto)
TZ=America/Argentina/Buenos_Aires
```

### 🔐 Generar JWT_SECRET seguro

Ejecuta este comando para generar un secret seguro:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado y úsalo como valor de `JWT_SECRET`.

---

## 📋 PASO 2: Verificar Acceso a MongoDB

### Verificación de conexión

1. **Probar conexión desde el servidor:**
   ```bash
   # Si tienes mongo shell instalado
   mongo "mongodb+srv://usuario:password@cluster.mongodb.net/donky"
   
   # O usar mongosh (versión nueva)
   mongosh "mongodb+srv://usuario:password@cluster.mongodb.net/donky"
   ```

2. **Desde Node.js:**
   ```bash
   cd backend
   node -e "require('dotenv').config(); require('mongoose').connect(process.env.MONGO_URI).then(() => { console.log('✅ Conectado'); process.exit(0); }).catch(e => { console.error('❌ Error:', e.message); process.exit(1); });"
   ```

3. **Verificar desde el backend:**
   ```bash
   npm start
   # Deberías ver: "✅ MongoDB conectado correctamente"
   ```

---

## 📋 PASO 3: Verificar Variables de Entorno

### Script de verificación

Crea un archivo temporal `verify-env.js`:

```javascript
require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ ERROR: Faltan variables requeridas:', missing.join(', '));
  process.exit(1);
}

console.log('✅ Variables obligatorias presentes');
console.log('✅ MONGO_URI:', process.env.MONGO_URI ? 'Configurado' : 'FALTA');
console.log('✅ JWT_SECRET:', process.env.JWT_SECRET ? 'Configurado' : 'FALTA');
console.log('✅ FRONTEND_URL:', process.env.FRONTEND_URL || '⚠️  No configurado (usará CORS abierto)');
console.log('✅ NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('✅ PORT:', process.env.PORT || 4000);

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.warn('⚠️  ADVERTENCIA: FRONTEND_URL no configurado en producción');
}
```

Ejecuta:
```bash
node verify-env.js
```

---

## 📋 PASO 4: Probar Endpoints Críticos en Postman

Ver documento `ENDPOINTS_CRITICOS_POSTMAN.md` para la lista completa de endpoints a probar.

---

## ✅ Checklist Pre-Deploy

### Antes de Desplegar

- [ ] Archivo `.env` configurado con valores de producción
- [ ] `MONGO_URI` apunta a base de datos de producción
- [ ] `JWT_SECRET` generado y configurado (diferente al de desarrollo)
- [ ] `FRONTEND_URL` configurado con URL real del frontend
- [ ] `NODE_ENV=production` configurado
- [ ] Conexión a MongoDB verificada
- [ ] Variables de entorno verificadas (script)
- [ ] Health check funciona (`GET /`)
- [ ] Autenticación funciona (register/login)
- [ ] Endpoints críticos probados en Postman

### Después de Desplegar

- [ ] Servidor inicia sin errores
- [ ] Health check responde correctamente
- [ ] MongoDB conectado
- [ ] CORS configurado correctamente
- [ ] Logs no muestran errores
- [ ] Pruebas de endpoints críticos exitosas

---

## 🔍 Verificación Post-Deploy

1. **Health Check:**
   ```bash
   curl https://tu-api.com/
   # Debe responder: {"status":"API del Taller Donking funcionando 🚗"}
   ```

2. **Verificar logs:**
   ```bash
   # Ver que no haya errores al iniciar
   # Debe mostrar:
   # ✅ MongoDB conectado correctamente
   # 🚀 Servidor funcionando en http://localhost:PORT
   ```

3. **Probar autenticación:**
   - Usar Postman para probar register y login
   - Verificar que JWT se genere correctamente

---

## 📞 Solución de Problemas Comunes

### Error: "Falta la variable MONGO_URI"
- Verificar que el archivo `.env` existe en el directorio del backend
- Verificar que no tenga espacios o caracteres especiales
- En algunos hosts, las variables se configuran desde el panel (no archivo .env)

### Error: "Cannot connect to MongoDB"
- Verificar que la URI sea correcta
- Verificar que la IP del servidor esté en whitelist de MongoDB Atlas
- Verificar credenciales (usuario/password)
- Verificar que el cluster esté activo

### Error: "CORS error"
- Verificar que `FRONTEND_URL` esté configurado correctamente
- Verificar que la URL del frontend coincida exactamente (incluyendo https/http)

### Error: "JWT_SECRET no configurado"
- Verificar que la variable esté en `.env`
- Reiniciar el servidor después de cambiar `.env`

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd")

