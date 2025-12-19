
---

# 📄 `backend/docs/api/API_TURNOS.md`

👉 **Contrato API Backend ↔ Frontend / QA / Postman**

---

```md
# API – Turnos

Base URL:
`/api/turnos`

---

## Crear turno

POST /api/turnos

### Body

```json
{
  "cliente": "ObjectId",
  "vehiculo": "ObjectId",
  "fecha": "2025-10-20T14:00:00",
  "duracionMin": 60
}
