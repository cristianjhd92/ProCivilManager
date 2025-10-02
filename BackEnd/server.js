// File: BackEnd/server.js                                                      // Ruta del archivo dentro del proyecto
// Descripción: Punto de entrada del backend. Configura Express, CORS, DB,      // Propósito general del servidor
// Socket.io y monta las rutas de la API (usuarios, contactos, proyectos, etc). // Componentes principales inicializados aquí

require('dotenv').config();                                                    // Carga variables de entorno desde BackEnd/.env (debe ir lo antes posible)

const express  = require('express');                                           // Importa Express para crear la app HTTP
const cors     = require('cors');                                              // Importa CORS para habilitar llamadas desde el FrontEnd
const http     = require('http');                                              // Módulo nativo HTTP para crear el servidor base
const socketIo = require('socket.io');                                         // Socket.io para comunicación en tiempo real (WS)
const connectDB = require('./config/db');                                      // Función propia para conectar a MongoDB (Mongoose)

const app = express();                                                          // Crea la instancia de aplicación Express
const server = http.createServer(app);                                          // Crea un servidor HTTP a partir de la app Express

// Configura Socket.io sobre el servidor HTTP                                   // Inicializa WebSockets
// Nota: si tu FrontEnd corre en otro origen (puerto diferente), conviene       // Explicación de CORS para WS
// definir CORS explícito en Socket.io (ej: origin desde env)                    // Sugerencia para producción
const io = socketIo(server, {                                                   // Inicializa socket.io con opciones
  cors: {                                                                       // Bloque CORS para WS
    origin: process.env.CORS_ORIGIN || '*',                                     // Origen permitido (usa * en dev, restringe en prod)
    methods: ['GET','POST','PUT','PATCH','DELETE'],                             // Métodos permitidos
    credentials: true                                                           // Habilita envío de credenciales si aplica
  }
});                                                                              // Fin de configuración de Socket.io

// Middlewares globales                                                          // Sección de middlewares Express
app.use(cors({                                                                  // Aplica CORS a las rutas HTTP
  origin: process.env.CORS_ORIGIN || '*',                                       // Origen permitido (usa variable o * por defecto)
  methods: ['GET','POST','PUT','PATCH','DELETE'],                               // Métodos permitidos
  credentials: true                                                             // Permite cookies/autorización cruzada si fuera necesario
}));                                                                             // Fin de configuración de CORS
app.use(express.json());                                                        // Habilita parseo de JSON en bodies de solicitudes

// Importación de rutas                                                          // Sección de importación de routers
const userRoute       = require('./routes/userRoutes');                         // Rutas de usuarios (registro, login, perfil, admin)
const contactRoutes   = require('./routes/contactRoutes');                      // Rutas de contacto (formularios, mensajes)
const proyectosRoutes = require('./routes/ProyectoRoutes');                     // Rutas de proyectos (ojo a la mayúscula/minúscula del archivo)
const statsRoutes     = require('./routes/statsRoutes');                        // Rutas de estadísticas (endpoint(s) analíticos)
const reportRoutes    = require('./routes/reportRoutes');                       // Rutas de reportes (PDFs, etc.)

// Montaje de rutas bajo prefijos                                                // Asocia cada router a un prefijo de API
app.use('/api/user',     userRoute);                                            // Prefijo /api/user → endpoints de usuario
app.use('/api',          contactRoutes);                                        // Prefijo /api → endpoints de contacto (según tu router)
app.use('/api/proyectos', proyectosRoutes);                                     // Prefijo /api/proyectos → endpoints de proyectos
app.use('/api/stats',    statsRoutes);                                          // Prefijo /api/stats → endpoints de estadísticas
app.use('/api/reportes', reportRoutes);                                         // Prefijo /api/reportes → endpoints de reportes

// Healthcheck simple (opcional, útil para monitoreo)                            // Endpoint de verificación rápida
app.get('/health', (req, res) => {                                              // Define ruta GET /health
  res.status(200).json({ ok: true, uptime: process.uptime() });                 // Responde con estado del proceso
});                                                                              // Cierra handler de /health

// Configuración de eventos de Socket.io                                         // Sección de WebSockets
io.on('connection', (socket) => {                                               // Maneja una nueva conexión WS
  console.log('Usuario conectado');                                             // Log al conectar

  socket.on('mensaje', (data) => {                                              // Escucha evento 'mensaje' desde el cliente
    console.log(data);                                                          // Imprime el contenido recibido
    // Ejemplo: reenviar a todos los clientes conectados:                       // Sugerencia de broadcast
    // io.emit('mensaje', data);                                                // Descomenta si quieres broadcast
  });                                                                            // Cierra handler de 'mensaje'

  socket.on('disconnect', () => {                                               // Evento al desconectarse el cliente
    console.log('Usuario desconectado');                                        // Log al desconectar
  });                                                                            // Cierra handler de 'disconnect'
});                                                                              // Cierra configuración io.on('connection')

// Middleware 404 (debe ir DESPUÉS de montar las rutas)                          // Manejo de rutas no encontradas
app.use((req, res, next) => {                                                   // Middleware para 404
  res.status(404).json({ message: 'Recurso no encontrado', path: req.originalUrl }); // Respuesta estandarizada
});                                                                              // Cierra middleware 404

// Manejador de errores global (Express 5 soporta async/await)                   // Captura errores no manejados en handlers
app.use((err, req, res, next) => {                                              // Middleware de error
  console.error('Error no manejado:', err);                                     // Log técnico del error
  const status = err.status || 500;                                             // Toma status si viene, si no 500
  const payload = { message: 'Error interno del servidor' };                    // Mensaje genérico
  if (process.env.NODE_ENV === 'development') {                                 // En desarrollo damos más pistas
    payload.detail = err.message;                                               // Incluye detalle del error
  }                                                                             // Fin modo development
  res.status(status).json(payload);                                             // Envía respuesta de error
});                                                                              // Cierra manejador global

// Iniciar servidor HTTP                                                         // Arranque del servidor
const PORT = process.env.PORT || 5000;                                          // Determina el puerto desde env o default 5000

// Encapsulamos el arranque para ESPERAR a la DB                                 // Evita levantar sin conexión a DB
(async () => {                                                                   // IIFE asíncrona de arranque
  try {                                                                          // Intenta conectar DB y levantar
    await connectDB();                                                           // Espera conexión a MongoDB (usa MONGO_URI del .env)
    server.listen(PORT, () => {                                                  // Escucha en el puerto definido
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);          // Log de confirmación
    });                                                                          // Cierra server.listen
  } catch (err) {                                                                // Si la conexión falla
    console.error('❌ No se pudo iniciar el servidor por error de DB:', err);    // Log de error
    process.exit(1);                                                             // Sale con código de error
  }                                                                              // Cierra catch
})();                                                                            // Ejecuta IIFE

// Apagado elegante (graceful shutdown)                                          // Manejo de señales del proceso
const shutdown = async (signal) => {                                             // Función de cierre ordenado
  try {                                                                          // Intenta cerrar recursos
    console.log(`Recibida señal ${signal}, cerrando...`);                        // Log de señal
    await new Promise((resolve) => server.close(resolve));                       // Cierra servidor HTTP (deja de aceptar conexiones)
    const mongooseConn = require('mongoose').connection;                         // Obtiene conexión de Mongoose
    if (mongooseConn.readyState === 1) {                                         // Si está conectada
      await mongooseConn.close();                                                // Cierra conexión a MongoDB
    }                                                                            // Fin if conexión
    console.log('✅ Servidor y DB cerrados correctamente');                      // Log de cierre OK
    process.exit(0);                                                             // Sale sin error
  } catch (e) {                                                                  // Si algo falla al cerrar
    console.error('❌ Error durante el cierre:', e);                              // Log de error
    process.exit(1);                                                             // Sale con error
  }                                                                              // Cierra catch
};                                                                               // Cierra función shutdown

process.on('SIGINT',  () => shutdown('SIGINT'));                                 // Ctrl+C en terminal
process.on('SIGTERM', () => shutdown('SIGTERM'));                                // Señal de orquestadores (PM2/Docker/K8s)
process.on('unhandledRejection', (reason, p) => {                                // Promesas rechazadas sin catch
  console.error('⚠️  Unhandled Rejection:', reason);                              // Log de advertencia
});                                                                              // Cierra handler unhandledRejection
process.on('uncaughtException', (err) => {                                       // Excepciones no capturadas
  console.error('⚠️  Uncaught Exception:', err);                                  // Log de advertencia
  shutdown('uncaughtException');                                                 // Inicia cierre ordenado
});                                                                              // Cierra handler uncaughtException
