# 🔐 Guía de Configuración para Producción

## Archivo `.env` - Variables a Configurar

Tu archivo `.env` debe tener **5 variables principales** para producción. Aquí te explico qué cambiar en cada una:

---

### **1. NODE_ENV** ✅
```env
NODE_ENV=production
```
**¿Qué cambiar?** 
- ✅ **Ya está bien** si dice `production`
- ⚠️ Si dice `development`, cámbialo a `production`

**¿Por qué?**
- Activa modo producción (oculta detalles de errores, desactiva logs de desarrollo)

---

### **2. PORT** ✅
```env
PORT=4000
```
**¿Qué cambiar?**
- ✅ **Ya está bien** si es `4000` o el puerto que uses
- ⚠️ Si tu hosting usa otro puerto (ej: `8080`, `3000`), cámbialo

**¿Por qué?**
- Puerto donde escucha tu servidor Express

---

### **3. MONGO_URI** ⚠️ **OBLIGATORIO CAMBIAR**
```env
MONGO_URI=mongodb+srv://USUARIO:PASSWORD@HOST/NOMBRE_DB?retryWrites=true&w=majority
```
**¿Qué cambiar?**
- ❌ **DEBES REEMPLAZAR** con tu URI real de MongoDB
- Si usas **MongoDB Atlas**: copia la Connection String de tu cluster
- Si usas **MongoDB local**: `mongodb://localhost:27017/donky_prod`
- **Formato**: `mongodb+srv://usuario:password@cluster.mongodb.net/nombre_db?retryWrites=true&w=majority`

**Ejemplo real:**
```env
MONGO_URI=mongodb+srv://admin:MiPassword123@cluster0.abc123.mongodb.net/donky_produccion?retryWrites=true&w=majority
```

**⚠️ IMPORTANTE:** 
- Reemplaza `USUARIO`, `PASSWORD`, `HOST` y `NOMBRE_DB` con tus valores reales
- **NUNCA** compartas esta URI públicamente

---

### **4. JWT_SECRET** ⚠️ **OBLIGATORIO CAMBIAR**
```env
JWT_SECRET=pon_aqui_una_clave_secreta_larga_y_aleatoria_de_al_menos_64_caracteres
```
**¿Qué cambiar?**
- ❌ **DEBES GENERAR UNA CLAVE NUEVA** (no uses la del ejemplo)
- Genera una clave aleatoria de al menos 64 caracteres

**Cómo generar una clave segura:**

**Opción 1 - Desde Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Opción 2 - Desde PowerShell (Windows):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Opción 3 - Online:**
- Usa un generador de claves aleatorias (ej: https://randomkeygen.com/)
- Copia una clave de al menos 64 caracteres

**Ejemplo de clave válida:**
```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0
```

**⚠️ IMPORTANTE:**
- Esta clave debe ser **única** para tu proyecto
- **NUNCA** la compartas ni la subas al repositorio
- Si alguien tiene esta clave, puede generar tokens falsos

---

### **5. FRONTEND_URL** ⚠️ **OBLIGATORIO CAMBIAR**
```env
FRONTEND_URL=https://app.mitaller.com
```
**¿Qué cambiar?**
- ❌ **DEBES REEMPLAZAR** con la URL real de tu frontend
- Debe ser la URL pública donde está desplegado tu frontend
- **Sin barra final** (`/`)

**Ejemplos válidos:**
```env
# Si tu frontend está en un dominio propio:
FRONTEND_URL=https://app.mitaller.com

# Si está en Vercel:
FRONTEND_URL=https://donky-app.vercel.app

# Si está en Netlify:
FRONTEND_URL=https://donky-app.netlify.app

# Si está en un subdominio:
FRONTEND_URL=https://app.tudominio.com
```

**⚠️ IMPORTANTE:**
- Esta URL se usa para **CORS** (seguridad)
- Solo tu frontend desde esa URL podrá hacer peticiones a la API
- Si usas `*` en desarrollo, cámbialo a la URL real en producción

---

## 📋 Checklist de Configuración

Antes de desplegar a producción, verifica:

- [ ] `NODE_ENV=production`
- [ ] `PORT` configurado correctamente (o usa el default 4000)
- [ ] `MONGO_URI` apunta a tu base de datos de producción (no local)
- [ ] `JWT_SECRET` es una clave única y aleatoria generada por ti
- [ ] `FRONTEND_URL` es la URL real de tu frontend desplegado
- [ ] El archivo `.env` está en `.gitignore` (no se sube al repo)

---

## 🚀 Después de Configurar

1. **Guarda el archivo `.env`** en la carpeta `backend/`
2. **Reinicia el servidor** para que cargue las nuevas variables
3. **Prueba el login** para verificar que JWT funciona:
   ```bash
   POST /api/auth/login
   ```
4. **Verifica CORS** haciendo una petición desde tu frontend

---

## ❓ ¿Dudas?

Si tienes problemas:
- Verifica que todas las variables estén escritas **sin espacios** alrededor del `=`
- Verifica que no haya **comillas** alrededor de los valores (a menos que sean parte del valor)
- Revisa los logs del servidor al iniciar para ver errores de configuración

