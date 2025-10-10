// File: BackEnd/server.js                                                      // Ruta del archivo dentro del proyecto
// Descripción: Punto de entrada del backend. Configura Express, CORS, DB,      // Propósito general del servidor
// seguridad (Helmet), compresión, Socket.io y monta rutas (usuarios, etc.).    // Componentes iniciales

require('dotenv').config();                                                     // Carga variables de entorno lo antes posible

const express     = require('express');                                         // Framework HTTP
const cors        = require('cors');                                            // Middleware CORS
const http        = require('http');                                            // Servidor HTTP nativo
const socketIo    = require('socket.io');                                       // WebSockets (tempo real)
const helmet      = require('helmet');                                          // Cabeceras de seguridad (npm i helmet)
const compression = require('compression');                                     // Compresión gzip/br (npm i compression)
// const morgan   = require('morgan');                                          // (Opcional) Logger HTTP para dev

const path       = require('path');                                             // Utilidad para rutas de archivos
const connectDB  = require('./config/db');                                      // Conexión a MongoDB (Mongoose)

const app    = express();                                                       // Instancia de aplicación Express
const server = http.createServer(app);                                          // Servidor HTTP envolviendo la app

// ------------------------------- CORS (HTTP + WS) -------------------------------
const corsOptions = {                                                           // Opciones de CORS comunes
  origin: process.env.CORS_ORIGIN || '*',                                       // Orígenes permitidos (restringe en prod)
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],                     // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'],                            // Headers permitidos
  credentials: true,                                                            // Soporte de cookies/credenciales
  optionsSuccessStatus: 204,                                                    // Código para preflight OK
};                                                                              // Fin corsOptions

// ------------------------------- Socket.io --------------------------------------
const io = socketIo(server, { cors: corsOptions });                             // Inicializa Socket.io con CORS
app.set('io', io);                                                              // Expone io para usar en controladores (req.app.get('io'))

// ------------------------------- Middlewares globales ---------------------------
app.use(cors(corsOptions));                                                     // Habilita CORS para todas las rutas HTTP
// app.options('*', cors(corsOptions));                                          // ❌ No compatible con Express 5 (comodín "*")
// Si deseas responder explícitamente preflights, usa regex:
app.options(/.*/, cors(corsOptions));                                           // ✅ Preflights para cualquier ruta (regex en Express 5)
app.use(helmet());                                                              // Aplica cabeceras seguras por defecto
app.use(compression());                                                         // Habilita compresión de respuestas
// if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));           // (Opcional) Logueo en desarrollo
app.set('trust proxy', 1);                                                      // Detrás de proxy (Nginx/Heroku/K8s) confía en X-Forwarded-*

app.use(express.json({ limit: '1mb' }));                                        // Parseo de JSON con límite de 1MB

// ------------------------------- Importación de rutas ---------------------------
const userRoute       = require('./routes/userRoutes');                         // Endpoints de usuario (auth, perfil, admin)
const contactRoutes   = require('./routes/contactRoutes');                      // Endpoints de contacto (formulario/mensajes)
const proyectosRoutes = require('./routes/ProyectoRoutes');                     // Endpoints de proyectos (CRUD protegido)
const statsRoutes     = require('./routes/statsRoutes');                        // Endpoints analíticos (si no duplican reportes)
const reportRoutes    = require('./routes/reportRoutes');                       // Endpoints de reportes (PDF/XLSX/JSON)

// ------------------------------- Montaje de rutas -------------------------------
app.use('/api/user',       userRoute);                                          // Prefijo /api/user → usuarios
app.use('/api',            contactRoutes);                                      // Prefijo /api → contactos (ajustar si necesitas /api/contact)
app.use('/api/proyectos',  proyectosRoutes);                                    // Prefijo /api/proyectos → proyectos
app.use('/api/stats',      statsRoutes);                                        // Prefijo /api/stats → analíticas (no dupliques PDF/XLSX aquí)
app.use('/api/reportes',   reportRoutes);                                       // Prefijo /api/reportes → reportes

// ------------------------------- Documentación estática (opcional) -------------
app.use('/docs', express.static(path.join(__dirname, 'docs')));                 // Sirve /docs desde BackEnd/docs

// ------------------------------- Healthcheck ------------------------------------
app.get('/health', (req, res) => {                                              // Endpoint básico de salud
  res.status(200).json({ ok: true, uptime: process.uptime() });                 // Tiempo de actividad del proceso
});                                                                              // Fin /health

// ------------------------------- Socket.io handlers -----------------------------
io.on('connection', (socket) => {                                               // Al conectar un cliente WS
  console.log('👤 WS conectado');                                                // Log de conexión

  socket.on('mensaje', (data) => {                                              // Ejemplo de evento entrante
    console.log('WS mensaje:', data);                                           // Log del payload
    // io.emit('mensaje', data);                                                // (Opcional) Broadcast a todos
  });                                                                            // Fin handler 'mensaje'

  socket.on('disconnect', () => {                                               // Al desconectarse el cliente
    console.log('👋 WS desconectado');                                           // Log de desconexión
  });                                                                            // Fin handler 'disconnect'
});                                                                              // Fin io.on('connection')

// ------------------------------- 404 genérico -----------------------------------
app.use((req, res, next) => {                                                   // Middleware para rutas no encontradas
  res.status(404).json({ message: 'Recurso no encontrado', path: req.originalUrl }); // Respuesta 404 estándar
});                                                                              // Fin 404

// ------------------------------- Manejador global de errores --------------------
app.use((err, req, res, next) => {                                              // Captura errores no manejados
  console.error('Error no manejado:', err);                                     // Log detallado en servidor
  const status = err.status || 500;                                             // Código de estado
  const payload = { message: 'Error interno del servidor' };                    // Mensaje genérico
  if (process.env.NODE_ENV === 'development') {                                 // Modo dev: más detalle
    payload.detail = err.message;                                               // Mensaje del error
  }
  res.status(status).json(payload);                                             // Envía respuesta de error
});                                                                              // Fin manejador global

// ------------------------------- Arranque del servidor --------------------------
const PORT = process.env.PORT || 5000;                                          // Puerto desde env o 5000 por defecto

(async () => {                                                                   // IIFE asíncrona para orquestar arranque
  try {                                                                          // Intenta conectar y levantar
    await connectDB();                                                           // Conexión a MongoDB (usa MONGO_URI del .env)
    server.listen(PORT, () => {                                                  // Empieza a escuchar
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);          // Log de inicio
    });                                                                          // Fin listen
  } catch (err) {                                                                // Si falla DB, aborta
    console.error('❌ No se pudo iniciar por error de DB:', err);                // Log del fallo
    process.exit(1);                                                             // Sale con error
  }                                                                              // Fin try/catch
})();                                                                            // Ejecuta IIFE

// ------------------------------- Graceful shutdown ------------------------------
const shutdown = async (signal) => {                                             // Cierre ordenado de recursos
  try {                                                                          // Intenta cerrar todo limpio
    console.log(`Recibida señal ${signal}, cerrando...`);                        // Log de señal
    await new Promise((resolve) => server.close(resolve));                       // Deja de aceptar conexiones
    const mongooseConn = require('mongoose').connection;                         // Obtiene conexión Mongoose
    if (mongooseConn.readyState === 1) {                                         // Si está conectada
      await mongooseConn.close();                                                // Cierra la conexión a Mongo
    }
    console.log('✅ Servidor y DB cerrados correctamente');                      // Confirmación de cierre
    process.exit(0);                                                             // Salida OK
  } catch (e) {                                                                  // Si algo falla
    console.error('❌ Error durante el cierre:', e);                              // Log del error de cierre
    process.exit(1);                                                             // Salida con error
  }                                                                              // Fin try/catch
};                                                                               // Fin shutdown

process.on('SIGINT',  () => shutdown('SIGINT'));                                 // Ctrl+C en consola
process.on('SIGTERM', () => shutdown('SIGTERM'));                                // Señal de orquestadores
process.on('unhandledRejection', (reason) => {                                   // Promesas sin catch
  console.error('⚠️  Unhandled Rejection:', reason);                              // Log advertencia
});                                                                              // Fin handler unhandledRejection
process.on('uncaughtException', (err) => {                                       // Excepciones no capturadas
  console.error('⚠️  Uncaught Exception:', err);                                  // Log advertencia
  shutdown('uncaughtException');                                                 // Intenta cierre ordenado
});                                                                              // Fin handler uncaughtException
