// File: BackEnd/server.js                                                      // Ruta del archivo dentro del proyecto
// Descripción: Punto de entrada del backend. Configura Express, CORS, DB,      // Propósito general del servidor
// seguridad (Helmet), compresión, cookies (JWT refresh), rate limit y rutas.   // Componentes iniciales

require('dotenv').config();                                                     // Carga variables de entorno lo antes posible

const express      = require('express');                                        // Framework HTTP
const cors         = require('cors');                                           // Middleware CORS
const http         = require('http');                                           // Servidor HTTP nativo
const socketIo     = require('socket.io');                                      // WebSockets (tiempo real)
const helmet       = require('helmet');                                         // Cabeceras de seguridad
const compression  = require('compression');                                    // Compresión gzip/br
const cookieParser = require('cookie-parser');                                  // 🔐 Parseo de cookies (refresh token HttpOnly)
// ⛔️ Eliminado: express-rate-limit directo (ahora usamos middlewares centralizados en middleware/rateLimit) // Nota histórica
// const rateLimit    = require('express-rate-limit');                           // 🛡️  (YA NO SE USA AQUÍ)
// const morgan    = require('morgan');                                         // (Opcional) Logger HTTP para dev

const path      = require('path');                                              // Utilidad para rutas de archivos
const connectDB = require('./config/db');                                       // Conexión a MongoDB (Mongoose)

// ✅ NUEVO: rate limit global centralizado
const { rateLimitGlobal } = require('./middleware/rateLimit');                  // 🌐 Límite global por IP

const app    = express();                                                       // Instancia de aplicación Express
const server = http.createServer(app);                                          // Crea servidor HTTP a partir de la app

// ------------------------------- CORS (HTTP + WS) -------------------------------
// Nota importante: para que las cookies viajen, CORS debe tener credentials: true
// y el "origin" NO puede ser "*". Usa una URL definida (por defecto localhost:3000).
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';              // Origen permitido (ajusta en prod)
const corsOptions = {                                                           // Opciones CORS para HTTP y WS
  origin: ORIGIN,                                                               // Dominio del frontend permitido
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],                     // Métodos habilitados
  allowedHeaders: ['Content-Type', 'Authorization'],                            // Headers aceptados
  credentials: true,                                                            // 🔑 Permite enviar cookies
  optionsSuccessStatus: 204,                                                    // Código para respuestas preflight
};                                                                              // Cierra objeto de opciones CORS

// ------------------------------- Socket.io --------------------------------------
const io = socketIo(server, { cors: corsOptions });                             // Inicializa Socket.io con CORS idéntico a HTTP
app.set('io', io);                                                              // Expone io en la app (req.app.get('io'))

// ------------------------------- Middlewares globales ---------------------------
app.use(cors(corsOptions));                                                     // Aplica CORS a todas las rutas HTTP
// app.options('*', cors(corsOptions));                                          // ❌ En Express 5 no se acepta "*" literal
app.options(/.*/, cors(corsOptions));                                           // ✅ Habilita preflight para cualquier ruta vía regex
app.use(helmet());                                                              // Añade cabeceras de seguridad por defecto
app.use(compression());                                                         // Activa compresión de respuestas
app.set('trust proxy', 1);                                                      // Confía en cabeceras X-Forwarded-* (necesario si hay proxy)
// if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));           // (Opcional) Log de requests en desarrollo

app.use(express.json({ limit: '1mb' }));                                        // Body parser JSON con límite de tamaño
app.use(cookieParser());                                                        // 🍪 Habilita lectura de cookies (para refresh HttpOnly)

// ------------------------------- Rate limit global -----------------------------
// ✅ Mejor práctica: aplicar SOLO el límite global aquí.
// Los límites específicos (ej. login) van en los routers correspondientes.
app.use(rateLimitGlobal);                                                       // 🌐 Limita requests por IP a nivel de app

// ⛔️ Eliminado: rate limits inline específicos (los moveremos al router)        // Nota histórica de cambio
// const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, ... });
// const authLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, ... });
// app.use('/api/user/login', loginLimiter);
// app.use('/api/auth', authLimiter);

// ------------------------------- Importación de rutas ---------------------------
const userRoute       = require('./routes/userRoutes');                         // Endpoints de usuario (register/login/me/etc.)
const authRoutes      = require('./routes/authRoutes');                         // Endpoints JWT con cookies: /refresh, /logout
const contactRoutes   = require('./routes/contactRoutes');                      // Endpoints para contacto/formulario
const proyectosRoutes = require('./routes/ProyectoRoutes');                     // Endpoints de proyectos (CRUD protegido)
const statsRoutes     = require('./routes/statsRoutes');                        // Endpoints analíticos/estadísticas
const reportRoutes    = require('./routes/reportRoutes');                       // Endpoints de reportes (PDF/XLSX/JSON)

// ------------------------------- Montaje de rutas -------------------------------
app.use('/api/user',       userRoute);                                          // Monta router de usuarios bajo /api/user
app.use('/api/auth',       authRoutes);                                         // Monta router de auth bajo /api/auth
app.use('/api',            contactRoutes);                                      // Monta router de contacto (prefijo /api)
app.use('/api/proyectos',  proyectosRoutes);                                    // Monta CRUD de proyectos
app.use('/api/stats',      statsRoutes);                                        // Monta endpoints de estadísticas
app.use('/api/reportes',   reportRoutes);                                       // Monta endpoints de reportes

// ------------------------------- Documentación estática (opcional) -------------
app.use('/docs', express.static(path.join(__dirname, 'docs')));                 // Sirve estáticos desde BackEnd/docs

// ------------------------------- Healthcheck ------------------------------------
app.get('/health', (req, res) => {                                              // Endpoint de salud
  res.status(200).json({ ok: true, uptime: process.uptime() });                 // Respuesta con uptime del proceso
});                                                                              // Fin handler /health

// ------------------------------- Socket.io handlers -----------------------------
io.on('connection', (socket) => {                                               // Maneja nuevas conexiones WS
  console.log('👤 WS conectado');                                                // Log de conexión WS

  socket.on('mensaje', (data) => {                                              // Ejemplo de evento entrante
    console.log('WS mensaje:', data);                                           // Log del payload recibido
    // io.emit('mensaje', data);                                                // (Opcional) Reenvío/broadcast
  });                                                                            // Fin handler 'mensaje'

  socket.on('disconnect', () => {                                               // Evento desconexión WS
    console.log('👋 WS desconectado');                                           // Log de desconexión
  });                                                                            // Fin handler 'disconnect'
});                                                                              // Fin io.on('connection')

// ------------------------------- 404 genérico -----------------------------------
app.use((req, res, next) => {                                                   // Middleware para rutas inexistentes
  res.status(404).json({ message: 'Recurso no encontrado', path: req.originalUrl }); // Devuelve 404 con path solicitado
});                                                                              // Fin middleware 404

// ------------------------------- Manejador global de errores --------------------
app.use((err, req, res, next) => {                                              // Middleware de errores
  console.error('Error no manejado:', err);                                     // Log detallado del error
  const status = err.status || 500;                                             // Determina status HTTP
  const payload = { message: 'Error interno del servidor' };                    // Mensaje genérico para cliente
  if (process.env.NODE_ENV === 'development') {                                 // Si estamos en dev
    payload.detail = err.message;                                               // Añade detalle del error
  }
  res.status(status).json(payload);                                             // Envía respuesta de error
});                                                                              // Fin manejador global

// ------------------------------- Arranque del servidor --------------------------
const PORT = process.env.PORT || 5000;                                          // Puerto de escucha (env o 5000)

(async () => {                                                                   // IIFE async para orquestar arranque
  try {                                                                          // Bloque protegido
    await connectDB();                                                           // Conecta a MongoDB (Mongoose)
    server.listen(PORT, () => {                                                  // Inicia servidor HTTP
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);          // Log de arranque
    });                                                                          // Fin callback listen
  } catch (err) {                                                                // Si falla DB/arranque
    console.error('❌ No se pudo iniciar por error de DB:', err);                // Log del error
    process.exit(1);                                                             // Finaliza proceso con error
  }                                                                              // Fin try/catch
})();                                                                            // Ejecuta IIFE inmediatamente

// ------------------------------- Graceful shutdown ------------------------------
const shutdown = async (signal) => {                                             // Función de cierre ordenado
  try {                                                                          // Bloque protegido
    console.log(`Recibida señal ${signal}, cerrando...`);                        // Log de señal recibida
    await new Promise((resolve) => server.close(resolve));                       // Deja de aceptar nuevas conexiones
    const mongooseConn = require('mongoose').connection;                         // Obtiene conexión de Mongoose
    if (mongooseConn.readyState === 1) {                                         // Si está conectada
      await mongooseConn.close();                                                // Cierra conexión a MongoDB
    }
    console.log('✅ Servidor y DB cerrados correctamente');                      // Confirmación de cierre limpio
    process.exit(0);                                                             // Sale sin error
  } catch (e) {                                                                  // Si algo falla al cerrar
    console.error('❌ Error durante el cierre:', e);                              // Log del error de cierre
    process.exit(1);                                                             // Sale con código de error
  }                                                                              // Fin try/catch
};                                                                               // Fin definición shutdown

process.on('SIGINT',  () => shutdown('SIGINT'));                                 // Captura Ctrl+C en consola
process.on('SIGTERM', () => shutdown('SIGTERM'));                                // Captura señal de orquestadores
process.on('unhandledRejection', (reason) => {                                   // Promesas rechazadas sin catch
  console.error('⚠️  Unhandled Rejection:', reason);                              // Log de advertencia
});                                                                              // Fin handler unhandledRejection
process.on('uncaughtException', (err) => {                                       // Excepciones no capturadas
  console.error('⚠️  Uncaught Exception:', err);                                  // Log de advertencia
  shutdown('uncaughtException');                                                 // Intenta cierre ordenado
});                                                                              // Fin handler uncaughtException
