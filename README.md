# Procivil Manager (PCM)

Gestor integral para empresas de ingeniería y construcción en Colombia. Monorepo con **BackEnd (Node/Express + MongoDB)** y **FrontEnd (React + Tailwind)**.

---

## 1) Arquitectura

- **BackEnd/**: API REST con Express, Mongoose, JWT, Nodemailer, PDFKit, Socket.IO.
- **FrontEnd/**: SPA en React (Create React App), Tailwind, Recharts, jsPDF.

**Puertos por defecto**: API `:5000`, Front `:3000`.

---

## 2) Estructura

### BackEnd/
```
.env
.env.example
config/db.js
controllers/ProyectosController.js
controllers/contactController.js
controllers/reportController.js
controllers/statsController.js
controllers/userController.js
middleware/authMiddleware.js
models/Contact.js
models/Proyectos.js
models/User.js
requirements_backend.txt
routes/ProyectoRoutes.js
routes/contactRoutes.js
routes/reportRoutes.js
routes/statsRoutes.js
routes/userRoutes.js
server.js
services/ServiceEmail.js
```

### FrontEnd/
```
README.md
postcss.config.js
public/10.png
public/favicon.ico
public/index.html
public/logo192.png
public/logo512.png
public/manifest.json
public/robots.txt
requirements_frontend.txt
src/.env.local (52B)
src/Admin/Dashboard.jsx
src/App.css
src/App.js
src/App.test.js
src/components/AdminRoute.jsx
src/components/Fotter.js
src/components/LiderRoute.jsx
src/components/NavBar.js
src/components/PrivateRoute.jsx
src/index.css
src/index.js
src/logo.svg
src/pages/Inicio.jsx
src/pages/cambio.jsx
src/pages/construccion_solicitud.jsx
src/pages/contacto.jsx
src/pages/historial.jsx
src/pages/login.jsx
src/pages/perfil.jsx
src/pages/proyectos.jsx
src/pages/register.jsx
src/pages/servicios.jsx
src/pages/solicitar.jsx
src/reportWebVitals.js
src/setupTests.js
tailwind.config.js
```

---

## 3) Requisitos previos
- Node.js ≥ 18 LTS (recomendado 20 LTS)
- npm ≥ 9 (o pnpm/yarn)
- MongoDB ≥ 6 (local o Atlas)

---

## 4) Instalación

### 4.1 BackEnd – librerías primero
Instala las dependencias que **sí se usan**:
```bash
cd BackEnd
npm install bcryptjs cors dotenv express jsonwebtoken mongoose nodemailer pdfkit socket.io
npm install -D nodemon
```
BackEnd/.env.example. Úsalo como plantilla.

Variables requeridas (revísalas en tu `.env`):
- `MONGO_URI` (local o Atlas)
- `PORT` (p. ej., 5000)
- `JWT_SECRET` (clave larga y aleatoria)

Ejecutar:
```bash
npm run dev
# o
npm start
```

### 4.2 FrontEnd – librerías primero
Instala las dependencias que **sí se usan**:
```bash
cd FrontEnd
npm install @testing-library jspdf jspdf-autotable lucide-react react react-dom react-router-dom react-scripts recharts
```

Dependencias de **desarrollo** (Tailwind y Testing):
```bash
npm install -D @testing-library/jest-dom @testing-library/react autoprefixer postcss tailwindcss
```

FrontEnd/tailwind.config.js y postcss.config.js.

Variables del FrontEnd:
```ini
REACT_APP_API_URL=http://localhost:5000
PORT=3000
```
> En CRA, las variables que se exponen deben iniciar con `REACT_APP_`.

Ejecutar:
```bash
npm start
```

---

## 5) Endpoints
- `/api/user/*`: registro, login, perfil, cambio de contraseña.
- `/api/proyectos/*`: CRUD, recientes, mis-proyectos.
- `/api/reportes/*`: generación de PDF.
- `/api/stats/*`: estadísticas.

> Revisa `BackEnd/routes/*.js` para la lista exacta.

---

## 6) Seguridad y buenas prácticas
- Usar **JWT** con expiración y guardado **hash** con `bcryptjs`.
- Habilitar **CORS** sólo para orígenes permitidos.
- Mover **credenciales** a `.env` (no subirlo al repo). Mantener actualizado `.env.example`.
- Añadir `helmet` y `express-rate-limit` (recomendado).
- Validar entradas (express-validator / joi / zod).

---

## 7) Calidad (QA) – checklist
- Lint + formato (ESLint + Prettier).
- Tests: **Front** con React Testing Library, **Back** con Jest + Supertest.
- Pipelines CI básicos (lint + test + audit).
- SemVer y Conventional Commits.

---

## 8) Contribución (flujo simple para curso)
1. Rama `feat/<nombre>` desde `develop`.
2. Ejecutar lint y tests.
3. PR con pasos de prueba y capturas.
4. Merge respetando Conventional Commits.

---

## 9) Créditos
Equipo Procivil Manager – 2025

