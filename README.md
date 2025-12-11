# ProCivil Manager (PCM)

Gestor integral para empresas de **ingeniería y construcción** en Colombia.  
Permite administrar proyectos, solicitudes, inventarios, presupuestos y comunicación con clientes desde un **tablero web** moderno (SPA) con backend en Node.js + MongoDB.

---

## 📌 Tabla de contenido

1. [Descripción general](#-descripción-general)  
2. [Características principales](#-características-principales)  
3. [Arquitectura general](#-arquitectura-general)  
4. [Tecnologías principales](#-tecnologías-principales)  
5. [Estructura del proyecto](#-estructura-del-proyecto)  
6. [Requisitos previos](#-requisitos-previos)  
7. [Variables de entorno](#-variables-de-entorno)  
   - [Backend](#backend)  
   - [Frontend](#frontend)  
8. [Instalación y ejecución en desarrollo](#-instalación-y-ejecución-en-desarrollo)  
   - [Backend](#backend-1)  
   - [Frontend](#frontend-1)  
   - [Datos de prueba (seed)](#datos-de-prueba-seed)  
9. [Build y despliegue](#-build-y-despliegue)  
   - [Despliegue sugerido (Render + MongoDB Atlas)](#despliegue-sugerido-render--mongodb-atlas)  
10. [Módulos y endpoints principales](#-módulos-y-endpoints-principales)  
11. [Tiempo real (Socket.io)](#-tiempo-real-socketio)  
12. [Servicio de correo (Gmail OAuth2)](#-servicio-de-correo-gmail-oauth2)  
13. [Seguridad y buenas prácticas](#-seguridad-y-buenas-prácticas)  
14. [Calidad (QA)](#-calidad-qa)  
15. [Flujo de contribución](#-flujo-de-contribución)  
16. [Créditos](#-créditos)  

---

## 🏗️ Descripción general

**ProCivil Manager (PCM)** es una aplicación web orientada a:

- Empresas de **ingeniería y construcción** en Colombia.
- Parques industriales, conjuntos residenciales, propiedad horizontal, interventorías y oficinas de ingeniería.

Permite:

- Gestionar proyectos y su avance.
- Registrar solicitudes de clientes y contactos desde el sitio público.
- Llevar control de inventarios, almacenes y presupuestos de materiales por proyecto.
- Generar reportes y PDFs.
- Mantener un historial de auditoría interno (quién hizo qué y cuándo).
- Notificar en tiempo real ciertos eventos clave (alertas, solicitudes, etc.).

---

## ✨ Características principales

- **Panel interno (workspace)** segmentado por rol:
  - **Administrador:** usuarios, proyectos, almacenes, inventario, presupuestos, alertas, auditoría, estadísticas.
  - **Líder de obra:** proyectos asignados, solicitudes, movimientos de inventario, presupuestos asociados.
  - **Cliente:** avance de sus proyectos, historial de solicitudes, reportes clave.
  - **Auditor / SGI:** vistas de consulta de registros de auditoría y estados.

- **Sitio público (landing):**
  - Página de inicio con propuesta de valor para el sector construcción en Colombia.
  - Sección de **servicios**.
  - Listado de **proyectos públicos** destacados.
  - **Formulario de contacto** con envío de correo y registro en base de datos.

- **Módulo de proyectos:**
  - Alta, edición, eliminación lógica y detalle de proyectos.
  - Asignación de líder y cliente.
  - Adjuntos (documentos, imágenes, etc.).
  - Vinculación con inventario, almacenes y presupuestos de materiales.
  - Reportes en PDF y vistas resumen para clientes.

- **Inventario y almacenes:**
  - Gestión de **almacenes** (bodegas).
  - Gestión de **materiales**.
  - Registro de **movimientos de inventario** (entradas, salidas, ajustes).
  - Alertas por stock mínimo.

- **Presupuestos (budgets):**
  - Presupuesto de materiales por proyecto.
  - Actualización y consulta centralizada.
  - Integración con auditoría y alertas.

- **Solicitudes y contactos:**
  - Registro de **solicitudes de proyecto** y contactos desde el sitio público.
  - Bandeja interna para seguimiento y respuesta.
  - Relación con clientes y proyectos.

- **Auditoría y estadísticas:**
  - Registro de acciones clave en el sistema.
  - Consulta de **audit logs** (solo admin).
  - Endpoints y vistas para **estadísticas** que alimentan gráficos en el frontend.

---

## 🧱 Arquitectura general

Monorepo con dos aplicaciones principales en la raíz del proyecto:

- `backend/` – API REST con **Express 5**, **MongoDB/Mongoose 8**, **Socket.io** y servicio de correos (Nodemailer + Gmail OAuth2).
- `frontend/` – SPA en **React 19** con **Vite 7**, **React Router DOM 7** y **Tailwind CSS 4** con tema visual PCM.

Comunicación entre ambas:

- API REST bajo prefijo `/api`.
- **Socket.io** para eventos en tiempo real.
- El frontend lee:
  - `VITE_API_URL` para la API.
  - `VITE_SOCKET_URL` para Socket.io.

---

## 🛠️ Tecnologías principales

**Backend**

- Node.js `>= 20.0.0`
- Express 5
- MongoDB 6+ / MongoDB Atlas
- Mongoose 8
- Socket.io 4
- bcryptjs
- jsonwebtoken
- dotenv
- nodemailer
- googleapis (Gmail OAuth2)
- pdfkit
- multer
- @faker-js/faker (datos de prueba)

**Frontend**

- Vite 7
- React 19
- React Router DOM 7
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Axios
- jsPDF + jspdf-autotable
- jwt-decode
- lucide-react
- Vitest + Testing Library (testing)
- ESLint 9

---

## 📂 Estructura del proyecto

La estructura relevante del monorepo es:

```bash
procivilmanager/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── scripts/
│   │   ├── generarDatosPrueba.js             # Seed de datos realistas (Colombia)
│   │   └── obtenerTokenActualizadoGmail.js   # Script para obtener refresh token de Gmail
│   └── src/
│       ├── config/
│       │   ├── conexionBaseDatos.js          # Conexión a MongoDB (MONGO_URI)
│       │   └── roles.json                    # Definición de roles (admin, líder, cliente, auditor)
│       ├── core/
│       │   ├── middlewares/
│       │   │   ├── autenticacion.middleware.js
│       │   │   └── autorizarRoles.middleware.js
│       │   ├── services/
│       │   │   └── correo.servicio.js        # Servicio central de correos (Gmail OAuth2)
│       │   └── utils/                        # Utilidades compartidas
│       └── modules/
│           ├── users/        # Usuarios y roles
│           ├── projects/     # Proyectos, adjuntos, progreso
│           ├── warehouses/   # Almacenes
│           ├── inventory/    # Materiales y movimientos de inventario
│           ├── budgets/      # Presupuestos de materiales por proyecto
│           ├── contacts/     # Contactos desde el sitio público
│           ├── requests/     # Solicitudes de proyecto
│           ├── alerts/       # Alertas (stock, solicitudes, etc.)
│           ├── reports/      # Reportes y PDFs
│           ├── audit/        # Auditoría (audit logs)
│           ├── status/       # Estadísticas / indicadores
│           ├── services/     # Servicios auxiliares
│           ├── utils/        # Utilidades de módulos
│           └── uploads/      # Carpeta de archivos adjuntos
│
└── frontend/
    ├── package.json
    ├── vite.config.js                         # Vite 7 + React + Tailwind v4 (modo compat)
    ├── tailwind.config.js                     # Tema PCM (paleta, sombras, animaciones, roles)
    ├── public/
    │   ├── favicon.ico
    │   ├── logo192.png
    │   ├── logo512.png
    │   └── manifest.json
    └── src/
        ├── main.jsx                           # Punto de entrada (BrowserRouter + App)
        ├── App.jsx                            # Definición de rutas públicas + workspace
        ├── index.css                          # Tailwind v4 + helpers .pcm-*
        ├── assets/
        │   └── logo.svg
        ├── modules/
        │   ├── site/        # Landing, Servicios, Proyectos públicos, Contacto
        │   ├── auth/        # Login, registro, recuperar/cambiar contraseña
        │   ├── workspace/   # Layout del dashboard interno por rol
        │   ├── projects/    # Vistas y modales de proyectos
        │   ├── requests/    # Vistas de solicitudes (cliente y backoffice)
        │   ├── inventory/   # Materiales, movimientos
        │   ├── warehouses/  # Almacenes
        │   ├── users/       # Administración de usuarios
        │   ├── alerts/      # Bandeja de alertas
        │   ├── audit/       # Historial de auditoría
        │   ├── reports/     # Reportes del sistema
        │   ├── status/      # Dashboards / KPIs
        │   ├── profile/     # Perfil de usuario
        │   ├── manuals/     # Manuales de usuario por rol y manual técnico admin
        │   └── mail/        # Vistas relacionadas con comunicaciones (si aplica)
        └── services/
            ├── api/api.js              # Cliente central de API (VITE_API_URL)
            └── realtime/socket.js      # Cliente Socket.io (VITE_SOCKET_URL)
```

---

## ✅ Requisitos previos

- **Node.js** `>= 20.0.0`  
- **npm** `>= 9` (o pnpm/yarn si se prefiere)  
- **MongoDB** 6+ (instancia local) o **MongoDB Atlas**  
- Cuenta en **Google Cloud / Gmail** si se quiere usar envío de correos con OAuth2.

---

## 🔐 Variables de entorno

> **Nunca** subir el archivo `.env` al repositorio. Usa siempre los `.env.example` como plantilla.

### Backend

Archivo plantilla: `backend/.env.example`  
Crear a partir de él: `backend/.env` y completar con tus valores:

```bash
# Base de datos
MONGO_URI=mongodb+srv://USUARIO:CONTRASENA@HOST.mongodb.net/NOMBRE_BASE

# Servidor
PORT=5000
NODE_ENV=development   # development | production | test

# JWT
JWT_SECRET=CAMBIA_ESTA_CLAVE_EN_TU_ENTORNO_REAL

# URL del frontend (para CORS y correos)
FRONTEND_URL=http://localhost:3000

# Correo emisor principal (desde donde se enviarán los correos)
MAIL_USER=tu-correo-principal@dominio.com

# Logo para correos (opcional)
PCM_LOGO_URL=https://ruta-a-tu-logo.png

# Destinatarios internos por defecto para notificaciones de contacto/solicitudes
CONTACT_RECIPIENTS=correo1@empresa.com,correo2@empresa.com

# Configuración Gmail OAuth2 (para Nodemailer + Gmail)
GMAIL_CLIENT_ID=TU_CLIENT_ID_DE_GOOGLE
GMAIL_CLIENT_SECRET=TU_CLIENT_SECRET_DE_GOOGLE
GMAIL_REDIRECT_URI=http://localhost
GMAIL_REFRESH_TOKEN=REFRESH_TOKEN_OBTENIDO_CON_EL_SCRIPT
```

### Frontend

Archivo plantilla: `frontend/.env.example`  
Crear a partir de él: `frontend/.env` y ajustar:

```bash
VITE_API_URL=http://localhost:5000/api   # URL base de la API
VITE_SOCKET_URL=http://localhost:5000    # URL del servidor de Socket.io
VITE_APP_NAME=ProCivil Manager           # Nombre para títulos y UI
VITE_ENV=development                     # development | production | test
```

---

## 🚀 Instalación y ejecución en desarrollo

Clonar el repositorio:

```bash
git clone https://github.com/<tu-usuario>/<tu-repo>.git
cd <tu-repo>/procivilmanager
```

### Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear .env desde la plantilla
cp .env.example .env
# Editar .env con MONGO_URI, JWT_SECRET, MAIL_USER, etc.

# Ejecutar en modo desarrollo (con nodemon)
npm run dev

# o modo producción simple
npm start
```

Por defecto el backend escucha en `http://localhost:5000`.

### Frontend

En otra terminal:

```bash
cd frontend

# Instalar dependencias
npm install

# Crear .env desde la plantilla
cp .env.example .env
# Editar .env para que apunte a tu backend local:
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000

# Levantar el servidor de desarrollo de Vite
npm run dev
```

El frontend se levanta por defecto en `http://localhost:3000` (configurado en `vite.config.js`).

---

### Datos de prueba (seed)

El proyecto incluye un script para generar **datos de prueba realistas** (usuarios, proyectos, almacenes, inventario, presupuestos, solicitudes, contactos, alertas, auditoría) con contexto de ingeniería civil colombiana.

Desde `backend/`:

```bash
cd backend

# Asegúrate de que MONGO_URI apunte a una base de pruebas
npm run seed
```

> Esto poblará la base de datos con datos de ejemplo para poder navegar el dashboard sin tener que crear todo manualmente.

---

## 📦 Build y despliegue

### Frontend – build de producción

```bash
cd frontend
npm run build
```

Genera la carpeta `dist/` lista para ser servida por cualquier hosting estático (Render Static Site, Vercel, Netlify, Nginx, etc.).

### Backend – producción

En entorno de producción:

- Configurar `NODE_ENV=production`.
- Usar un `MONGO_URI` de producción (ej. MongoDB Atlas).
- Configurar todas las variables de entorno en el proveedor (Render, Railway, etc.).

```bash
cd backend
npm install
npm start
```

---

### Despliegue sugerido (Render + MongoDB Atlas)

**1. MongoDB Atlas**

- Crear un cluster gratuito.
- Crear un usuario y obtener la cadena de conexión (MONGO_URI).
- Configurarla en el `.env` local y en el panel de Render.

**2. Backend en Render**

- Crear un servicio **Web Service** apuntando a `/backend`.
- Build command: `npm install`
- Start command: `npm start`
- Configurar variables de entorno del backend (MONGO_URI, JWT_SECRET, MAIL_USER, FRONTEND_URL, Gmail OAuth, etc.).

**3. Frontend en Render**

- Crear un **Static Site** apuntando a `/frontend`.
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Variables:  
  `VITE_API_URL=https://<tu-backend>.onrender.com/api`  
  `VITE_SOCKET_URL=https://<tu-backend>.onrender.com`

**4. CORS**

- En `backend/server.js` se usa `FRONTEND_URL` para el origen permitido.  
  En producción, definir `FRONTEND_URL` con la URL final del frontend (Render, Vercel, etc.).

---

## 🧩 Módulos y endpoints principales

Prefijo general de la API: `/api`

**Usuarios** (`/api/user`)

- Registro, login, perfil, cambio de contraseña.
- Manejo de roles (admin, líder, cliente, auditor).
- Bloqueo por intentos fallidos (seguridad).

**Proyectos** (`/api/proyectos`)

- CRUD de proyectos.
- Filtros por estado, líder, cliente.
- Adjuntos y seguimiento de progreso.
- Integración con presupuestos de materiales.

**Contactos** (`/api` con rutas internas de contacto)

- Recepción de mensajes desde el formulario público de contacto.
- Notificación interna por correo.

**Estadísticas** (`/api/stats`)

- Endpoints para dashboards (overview, recientes, etc.).

**Reportes** (`/api/reportes`)

- Generación de PDFs y reportes específicos.

**Almacenes** (`/api/almacenes`)

- CRUD de almacenes.

**Materiales** (`/api/materiales`)

- Gestión del catálogo de materiales.

**Movimientos de inventario** (`/api/movimientos`)

- Entradas, salidas, ajustes.
- Actualización de stock por material y almacén.

**Presupuestos** (`/api/presupuestos`)

- Presupuesto de materiales por proyecto.

**Alertas** (`/api/alertas`)

- Gestión de alertas internas (stock mínimo, nuevas solicitudes, etc.).

**Solicitudes** (`/api/solicitudes`)

- Registro y seguimiento de solicitudes de proyecto realizadas por clientes.

**Auditoría** (`/api/auditlogs`)

- Historial de acciones del sistema (solo accesible por admin).

**Health check** (`/api/health`)

- Endpoint simple para verificar si el backend está operativo.

---

## ⚡ Tiempo real (Socket.io)

El backend crea un servidor de **Socket.io** sobre el mismo servidor HTTP de Express.  
El frontend se conecta usando `socket.io-client`:

- URL tomada de `VITE_SOCKET_URL`.
- Envía el token JWT en el handshake para autenticar la conexión.
- Recibe eventos de **nuevas alertas** y otras notificaciones en tiempo real.

---

## 📧 Servicio de correo (Gmail OAuth2)

El servicio `backend/src/core/services/correo.servicio.js` centraliza el envío de correos:

- **Casos principales:**
  - Recuperación de contraseña.
  - Notificación de contacto.
  - Bienvenida a la plataforma.
  - Notificación de nuevas solicitudes.

- Usa:
  - `nodemailer` + `googleapis` (OAuth2).
  - Plantilla HTML con identidad visual PCM y contexto colombiano.

- Variables clave:
  - `MAIL_USER`
  - `CONTACT_RECIPIENTS`
  - `PCM_LOGO_URL`
  - `GMAIL_CLIENT_ID`
  - `GMAIL_CLIENT_SECRET`
  - `GMAIL_REDIRECT_URI`
  - `GMAIL_REFRESH_TOKEN`

Para obtener el `GMAIL_REFRESH_TOKEN` se incluye el script:

```bash
cd backend
node scripts/obtenerTokenActualizadoGmail.js
```

---

## 🔒 Seguridad y buenas prácticas

- **JWT** para autenticación, con secret definido en `JWT_SECRET`.
- **Hash de contraseñas** con `bcryptjs`.
- **Roles y autorización** mediante middlewares:
  - `autenticacion.middleware.js`
  - `autorizarRoles.middleware.js`
- **CORS** controlado por `FRONTEND_URL`.
- **Variables sensibles** únicamente en `.env` (no subir al repositorio).
- Auditoría de acciones relevantes (módulo `audit`).

---

## 🧪 Calidad (QA)

Scripts propuestos (según `package.json`):

### Frontend

```bash
cd frontend

# Linter
npm run lint

# Tests (Vitest + Testing Library)
npm run test
```

### Backend

Actualmente cuenta con scripts de ejecución y seed; se recomienda añadir ESLint/Jest si se desea extender la automatización de QA:

```bash
cd backend

# Desarrollo
npm run dev

# Seed de datos
npm run seed
```

---

## 👥 Flujo de contribución

Flujo sugerido (para equipo o uso académico):

1. Crear rama a partir de `develop`:

   ```bash
   git checkout develop
   git pull
   git checkout -b feat/<nombre-de-la-feature>
   ```

2. Realizar cambios en backend y/o frontend.

3. Ejecutar linter y tests en frontend (y los que se agreguen en backend):

   ```bash
   cd frontend
   npm run lint
   npm run test
   ```

4. Hacer commit siguiendo **Conventional Commits** (ej. `feat: agregar vista de reportes`).

5. Abrir **Pull Request** hacia `develop` con:
   - Descripción del cambio.
   - Pasos para probar.
   - Capturas de pantalla si aplica.

6. Revisar PR y hacer merge cuando esté aprobado.

---

## 🙌 Créditos

Desarrollado por el equipo **ProCivil Manager (PCM)** – 2025.  
Enfocado en la realidad operativa de empresas de **ingeniería y construcción en Colombia**.

Si quieres reportar un bug, proponer una mejora o colaborar, abre un **issue** o un **pull request** en este repositorio.
