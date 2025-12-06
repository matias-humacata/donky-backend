# Donky - Backend

Backend del sistema de gestión de turnos del taller Donky.

## Resumen

API en Node.js + Express + MongoDB para gestionar clientes, vehículos y turnos.

## Requisitos

- Node.js >= 18
- MongoDB

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores:

- `MONGO_URI` - URI de conexión a MongoDB
- `PORT` - Puerto donde correr la API (default `4000`)
- `FRONTEND_URL` - URL del frontend (para CORS)
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
- Agregar un `.env` con `MONGO_URI` antes de ejecutar.

## Siguientes pasos recomendados

- Agregar autenticación y/o roles
- Implementar paginación en endpoints que devuelven listas
- Añadir pruebas y CI
