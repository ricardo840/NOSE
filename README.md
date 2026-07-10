# NOSE

Panel de detección por coordenadas con historial persistente para Railway.

## Despliegue en Railway

1. Sube este proyecto a GitHub.
2. En Railway, crea un proyecto nuevo desde el repositorio.
3. Agrega un servicio de base de datos PostgreSQL al mismo proyecto.
4. Si Railway no la crea automáticamente, agrega la variable de entorno `DATABASE_URL` en el servicio web con la URL de PostgreSQL.
5. Usa la cadena de conexión solo en el backend. No la expongas en el frontend ni en archivos públicos.
6. Verifica que el comando de arranque sea `npm start`.
7. Despliega el servicio.

## Requisitos

- Node.js
- `express`
- `pg`

## Cómo funciona el historial

- El frontend envía los registros a `POST /api/historial`.
- El historial se lee desde `GET /api/historial`.
- Los datos se guardan en PostgreSQL, no en `localStorage`.

## Prueba rápida

- `GET /health` responde con `{ "ok": true }`.
- Si `DATABASE_URL` no existe, la app arranca pero el historial no se guarda de forma persistente.
