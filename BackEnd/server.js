// File: BackEnd/server.js
// Description: Punto de entrada del backend de ProCivil Manager (PCM).
//              Configura Express, conexión a MongoDB, middlewares,
//              rutas principales y Socket.io para notificaciones en tiempo real.

// 🔹 Carga de variables de entorno desde el archivo .env
//     Se hace ANTES de importar cualquier módulo que use process.env.
require('dotenv').config();                  // Hace disponibles las variables definidas en .env en process.env

// 🔹 Importaciones base de Node y librerías de terceros
const express = require('express');          // Framework web principal para construir la API HTTP
const cors = require('cors');               // Middleware para habilitar CORS entre frontend y backend
const http = require('http');               // Módulo nativo de Node para crear el servidor HTTP
const socketIo = require('socket.io');      // Librería para comunicaciones en tiempo real (WebSockets)
const path = require('path');               // Utilidad de Node para manejar y unir rutas de archivos

// 🔹 Importación de la función de conexión a la base de datos
const connectDB = require('./src/config/conexionBaseDatos');    // Función personalizada que realiza la conexión a MongoDB

// 🔹 Determinar origen permitido para CORS (frontend)
//     - En desarrollo: si no existe FRONTEND_URL, se usa '*' para permitir todo.
//     - En producción: se recomienda definir FRONTEND_URL con el dominio del frontend de PCM.
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || '*';        // Origen permitido para peticiones HTTP y WebSockets
console.log(`🌐 CORS permitido para origen: ${FRONTEND_ORIGIN}`); // Log informativo del origen configurado

// 🔹 Conexión a la base de datos MongoDB
//     Se ejecuta antes de levantar el servidor para que la API tenga acceso al motor de datos.
connectDB();                                                    // Inicia la conexión con MongoDB usando la configuración de ./src/config/conexionBaseDatos

// 🔹 Inicialización de la aplicación Express
const app = express();                                          // Crea la instancia principal de la aplicación Express

// 🔹 Creación del servidor HTTP y enlace con Express
//     Socket.io necesita trabajar sobre una instancia de servidor HTTP nativa.
const server = http.createServer(app);                          // Envuelve la app de Express dentro de un servidor HTTP

// 🔹 Configuración de Socket.io con soporte CORS
//     Se vincula la instancia de Socket.io al servidor HTTP creado arriba.
const io = socketIo(server, {                                   // Crea la instancia de Socket.io conectada al servidor HTTP
  cors: {                                                       // Configura CORS específico para los canales de WebSocket
    origin: FRONTEND_ORIGIN,                                    // Origen permitido (dominio del frontend o '*' en desarrollo)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],                  // Métodos HTTP permitidos para las peticiones asociadas
  },
});

// 🔹 Almacenar la instancia de Socket.io en la app para usarla en controladores
//     Esto permite acceder a io desde cualquier controlador mediante req.app.get('io').
app.set('io', io);                                              // Registra la instancia de Socket.io en la aplicación Express

// 🔹 Middlewares globales
//     Se aplican antes del montaje de las rutas.

// Middleware CORS para las peticiones HTTP normales
app.use(
  cors({
    origin: FRONTEND_ORIGIN,                                   // Origen permitido para consumir la API (frontend PCM)
  })
);

// Middleware para parsear cuerpos de tipo application/x-www-form-urlencoded
// Útil si en algún momento se envían formularios clásicos desde otra capa.
app.use(
  express.urlencoded({
    extended: true,                                            // Permite objetos anidados en el body.
    limit: '10mb',                                             // Mismo límite de tamaño que para JSON.
  })
);

// Middleware de parseo de JSON en el body de las peticiones
app.use(
  express.json({
    limit: '10mb',                                             // Límite máximo de tamaño para cuerpos JSON (10 MB)
  })
);

// 🔹 Servir archivos estáticos de la carpeta "uploads" (adjuntos de proyectos, etc.)
//     Permite acceder a archivos subidos desde el frontend mediante URLs públicas.
//     La ruta interna coincide con la usada en las rutas de proyectos: src/storage/uploads.
app.use(
  '/uploads',                                                  // Prefijo público: /uploads/...
  express.static(path.join(__dirname, 'src', 'storage', 'uploads'))
);

// 🔹 Importación de rutas (routers) de la API
//     Cada router agrupa endpoints de un módulo funcional del sistema PCM.
//     Rutas reales según el backend del .zip:

const userRoute = require('./src/modules/users/routes/usuario.rutas');             // Rutas de usuarios (registro, login, perfiles, admin)
const contactoRoutes = require('./src/modules/contacts/routes/contacto.rutas');    // Rutas de contacto público (formulario de contacto y listado para admin)
const proyectosRoutes = require('./src/modules/projects/routes/proyecto.rutas');   // Rutas de proyectos (CRUD, materiales, comentarios, adjuntos)
const statusRoutes = require('./src/modules/status/routes/estado.rutas');          // Rutas de estadísticas/KPIs para el dashboard (overview, proyectos recientes)
const reporteRoutes = require('./src/modules/reports/routes/reporte.rutas');       // Rutas para generación de reportes PDF de estadísticas + registro en Reporte
const almacenRoutes = require('./src/modules/warehouses/routes/almacen.rutas');   // Rutas de almacenes (bodegas físicas)
const materialRoutes = require('./src/modules/inventory/routes/material.rutas');   // Rutas de materiales (catálogo, stock, etc.)
const movimientoRoutes = require('./src/modules/inventory/routes/inventario.rutas'); // Rutas para movimientos de inventario (entradas/salidas/ajustes)
const presupuestoRoutes = require('./src/modules/budgets/routes/presupuesto.rutas'); // Rutas de presupuestos y costos de materiales por proyecto
const alertaRoutes = require('./src/modules/alerts/routes/alerta.rutas');          // Rutas de alertas y notificaciones internas
const solicitudRoutes = require('./src/modules/requests/routes/solicitud.rutas');  // Rutas de solicitudes (proyectos, materiales, etc.)
const auditlogRoutes = require('./src/modules/audit/routes/auditoria.rutas');      // Rutas de auditoría (registro de acciones de usuarios)

// 🔹 Montaje de las rutas sobre el prefijo /api
//     Define la estructura base de la API HTTP consumida por el frontend.
app.use('/api/user', userRoute);                          // Endpoints de usuario: /api/user/...
app.use('/api', contactoRoutes);                          // Endpoints de contacto: /api/contacto, /api/contact, etc.
app.use('/api/proyectos', proyectosRoutes);               // Endpoints de proyectos: /api/proyectos/...
app.use('/api/stats', statusRoutes);                      // Endpoints de estadísticas: /api/stats/overview, /api/stats/recent, etc.
app.use('/api/reportes', reporteRoutes);                  // Endpoints de reportes/PDFs: /api/reportes/estadisticas, etc.
app.use('/api/almacenes', almacenRoutes);                 // Endpoints de almacenes: /api/almacenes/...
app.use('/api/materiales', materialRoutes);               // Endpoints de materiales: /api/materiales/...
app.use('/api/movimientos', movimientoRoutes);            // Endpoints de movimientos de inventario: /api/movimientos/...
app.use('/api/presupuestos', presupuestoRoutes);          // Endpoints de presupuestos: /api/presupuestos/...
app.use('/api/alertas', alertaRoutes);                    // Endpoints de alertas: /api/alertas/...
app.use('/api/solicitudes', solicitudRoutes);             // Endpoints de solicitudes: /api/solicitudes/...
app.use('/api/auditlogs', auditlogRoutes);                // Endpoints de auditoría: /api/auditlogs/...

// (Opcional pero útil) Endpoint simple de salud de la API
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend PCM operativo',
    timestamp: new Date().toISOString(),
  });
});

// 🔹 Middleware 404 para rutas no encontradas
//     Si ninguna ruta anterior respondió, devolvemos una respuesta uniforme.
app.use((req, res, next) => {
  res.status(404).json({                                   // Código HTTP 404 → recurso no encontrado
    ok: false,                                             // Bandera estándar de error
    message: 'Ruta no encontrada',                         // Mensaje genérico para el cliente
    path: req.originalUrl,                                 // Ruta solicitada por el cliente
    method: req.method,                                    // Método HTTP utilizado (GET, POST, etc.)
  });
});

// 🔹 Middleware global de manejo de errores
//     Centraliza la forma en que se devuelven errores inesperados.
app.use((err, req, res, next) => {
  // Si la respuesta ya fue enviada, delegamos al manejador por defecto de Express
  if (res.headersSent) {
    return next(err);                                      // Delega al manejador de errores interno
  }

  console.error('Error no controlado en la API:', err);    // Log detallado en servidor para depuración

  const statusCode = err.statusCode || err.status || 500;  // Código HTTP del error (por defecto 500)
  const message =
    err.message || 'Ocurrió un error interno en el servidor.'; // Mensaje enviado al cliente

  res.status(statusCode).json({                            // Envía la respuesta de error al cliente
    ok: false,                                             // Bandera de error
    message,                                               // Mensaje amigable
  });
});

// 🔹 Configuración de eventos de Socket.io (canal tiempo real)
//     Aquí se definen los eventos básicos que los clientes pueden escuchar o emitir.
io.on('connection', (socket) => {                          // Se ejecuta cuando un cliente WebSocket se conecta a Socket.io
  console.log('🔌 Cliente WebSocket conectado vía Socket.io. ID:', socket.id); // Log técnico con el ID del socket

  // 🔹 Evento para marcar que un usuario de PCM se ha autenticado en este socket
  //     El frontend debe emitir este evento después de un login exitoso.
  socket.on('auth:userLogged', (userData) => {             // Escucha el evento custom "auth:userLogged" desde el cliente
    if (!userData || !userData.id) {                       // Valida que se envíe al menos un id de usuario
      console.warn(`⚠️ Evento auth:userLogged sin datos válidos desde el socket ${socket.id}`); // Log de advertencia
      return;                                              // Sale sin guardar nada si los datos son incorrectos
    }

    // Guardamos la info básica del usuario en el propio socket
    socket.data.user = {                                   // Socket.io 4 permite usar socket.data para adjuntar info
      id: userData.id,                                     // ID del usuario (por ejemplo, _id de MongoDB)
      nombre: userData.nombre,                             // Nombre o nombre completo del usuario
      email: userData.email,                               // Correo del usuario
      rol: userData.rol,                                   // Rol dentro de PCM (admin, lider_obra, cliente, etc.)
    };

    // Log claro indicando que ya tenemos al usuario autenticado en tiempo real
    console.log(
      `👤 Usuario autenticado en tiempo real: ${userData.nombre} (${userData.email}), ` +
      `rol: ${userData.rol}, socket: ${socket.id}`
    );
  });

  // Evento genérico de prueba para recibir mensajes desde el frontend
  socket.on('mensaje', (data) => {                         // Escucha eventos "mensaje" emitidos por el cliente
    console.log(`📩 Mensaje recibido por Socket.io desde el socket ${socket.id}:`, data); // Log con el ID del socket
  });

  // Evento al desconectarse el cliente
  socket.on('disconnect', (reason) => {                    // Escucha cuando el cliente cierra la conexión
    // Si el socket tenía un usuario autenticado, lo mostramos en el log
    if (socket.data && socket.data.user) {                 // Verificamos si en socket.data.user hay info guardada
      console.log(
        '❌ Cliente WebSocket desconectado. ' +
        `Usuario: ${socket.data.user.nombre} (${socket.data.user.email}), ` +
        `rol: ${socket.data.user.rol}, socket: ${socket.id}, razón: ${reason}`
      );
    } else {
      // Si no había usuario asociado, solo mostramos el ID del socket
      console.log(
        `❌ Cliente WebSocket desconectado (no autenticado). ID: ${socket.id}, razón: ${reason}`
      );
    }
  });
});

// 🔹 Arranque del servidor HTTP
//     Se determina el puerto desde la variable de entorno PORT o se usa 5000 por defecto.
const PORT = process.env.PORT || 5000;                     // Puerto en el que escuchará el servidor HTTP

// Inicia el servidor HTTP en el puerto definido
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`); // Log de confirmación en consola
});

// 🔹 Exportar la app (sin levantar servidor)
//     Útil para pruebas unitarias/integración o para reutilizar la configuración de Express.
module.exports = app;                                      // Exporta la instancia de Express para tests u otros usos
