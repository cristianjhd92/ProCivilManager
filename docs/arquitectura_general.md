# Arquitectura General
## Frontend
- Vite + React. Config: `frontend/vite.config.js`
- Tiempo real: `frontend/src/socket.js` (Socket.io Client)
- .env Frontend: variables públicas (prefijo VITE_)

## Backend
- Express + Mongoose + Socket.io Server.
- Middlewares: auth, roles, guardas de recurso.
- Rutas principales:
  - `BackEnd/routes/ProyectoRoutes.js`
  - `BackEnd/routes/UserRoutes.js`

## Base de datos (MongoDB Atlas)
- Conexión: `BackEnd/config/db.js`
- Modelos:
  - `BackEnd/models/User.js`
  - `BackEnd/models/Proyectos.js`
- Integridad referencial lógica (FK a `users._id`)

## Flujo de autenticación (JWT)
1. Login → JWT en headers.
2. `authMiddleware.js` inyecta `req.user`.
3. Rutas protegidas por rol con `requireRole`.

## Tiempo Real
- `server.js` monta Socket.io; CORS configurado.
- Cliente usa `socket.js`.

## Diagrama (alto nivel)
Frontend ⇄ Backend (REST + WS) ⇄ MongoDB
