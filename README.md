# Donky - Backend

Backend del sistema de gestión de turnos del taller Donky.

## Resumen

API en Node.js + Express + MongoDB para gestionar clientes, vehículos y turnos.

## Requisitos

- Node.js >= 18
- MongoDB

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores:

- `MONGO_URI` - URI de conexión a MongoDB (requerido)
- `JWT_SECRET` - Secret key para JWT tokens (requerido)
- `JWT_EXPIRES_IN` - Expiración de tokens JWT (default `24h`, ej: `1h`, `7d`, `30d`)
- `PORT` - Puerto donde correr la API (default `4000`)
- `FRONTEND_URL` - URL del frontend (para CORS, recomendado en producción)
- `N8N_WEBHOOK_APPROVAL` - Webhook opcional de n8n para notificaciones al confirmar turnos
- `NODE_ENV` - `development` o `production`

## Instalación

```powershell
cd 'c:\Users\Pc1\Documents\Matias\copia\Donky-3\backend'
npm install
```

## Scripts

- `npm run dev` — arranca con `nodemon` (desarrollo)
- `npm start` — arranca con `node` (producción)

## Notas

- `morgan` está habilitado sólo cuando `NODE_ENV !== 'production'`.
- Crear la configuración del taller (`/api/taller`) antes de crear turnos.
- Agregar un `.env` con `MONGO_URI` y `JWT_SECRET` antes de ejecutar.

## Seguridad

El backend incluye las siguientes medidas de seguridad:

- **Helmet**: Headers HTTP de seguridad
- **Rate Limiting**: Protección contra abuso y ataques de fuerza bruta
  - General: 100 requests/15min por IP
  - Autenticación: 5 intentos/15min por IP
  - Creación: 50 requests/hora por IP
- **Sanitización**: Remoción de caracteres peligrosos en entradas
- **Validación robusta**: Validación de email y otros campos
- **JWT con expiración**: Tokens con timeout configurable
- **Logging de seguridad**: Registro de intentos sospechosos

## Siguientes pasos recomendados

- Agregar autenticación y/o roles
- Implementar paginación en endpoints que devuelven listas
- Añadir pruebas y CI
