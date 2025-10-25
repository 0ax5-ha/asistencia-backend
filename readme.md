# Sistema de Asistencia - Backend

## Descripción
Servidor Express que guarda las asistencias en un archivo JSON, con verificación por IP y clave de administrador.

## Endpoints
- **POST /api/marcar** → marca una asistencia
- **GET /api/registros?key=0ax5=AX%qweASD** → obtiene todas las asistencias
- **GET /api/exportar?key=0ax5=AX%qweASD** → exporta las asistencias como CSV

## Deploy
1. Sube esta carpeta a GitHub.
2. En Render → “New Web Service”.
3. Conéctalo a tu repositorio.
4. En el paso de configuración:
   - **Runtime:** Node
   - **Build Command:** *(déjalo vacío)*
   - **Start Command:** `node server.js`
5. Render generará una URL pública, ej:
    https://asistencia-backend.onrender.com
6. Usa esa URL en el frontend (`user.js` y `admin.js`).
