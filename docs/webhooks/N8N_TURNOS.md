# Webhook – Turnos (Backend → n8n)

## Descripción

Este webhook es disparado por el backend cuando ocurre un evento relevante
en el ciclo de vida de un turno.

Actualmente el evento implementado es:

- `turno_confirmado`

El backend **NO depende de n8n** para funcionar.
Si n8n no responde, el backend continúa normalmente.

---

## Endpoint

El endpoint es configurado mediante variable de entorno:

N8N_WEBHOOK_APPROVAL

Ejemplo:
https://n8n.midominio.com/webhook/turnos

---

## Método

POST

---

## Headers

Content-Type: application/json

---

## Payload (CONTRATO ESTABLE)

```json
{
  "evento": "turno_confirmado",
  "turno": {
    "_id": "string",
    "fecha": "ISODate",
    "duracionMin": 60,
    "estado": "confirmado",
    "cliente": {
      "_id": "string",
      "nombre": "string",
      "telefono": "string"
    },
    "vehiculo": {
      "_id": "string",
      "marca": "string",
      "modelo": "string",
      "patente": "string"
    }
  }
}
