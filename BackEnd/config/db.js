// File: BackEnd/config/db.js                                                     // Ruta del archivo dentro del proyecto
// Descripción: Inicializa la conexión a MongoDB con Mongoose, con reintentos,   // Breve descripción del propósito del archivo
// manejo de eventos de conexión/desconexión, cierre ordenado y opciones         // Qué hace: conecta, escucha eventos, cierra limpio
// compatibles con Mongoose 8.x.                                                  // Nota de compatibilidad con la versión

const mongoose = require('mongoose');                                            // Importa Mongoose para gestionar la conexión a MongoDB

// Habilita logs de Mongoose si se define MONGOOSE_DEBUG=true                     // Permite activar logs detallados desde .env
if (String(process.env.MONGOOSE_DEBUG).toLowerCase() === 'true') {               // Verifica variable de entorno MONGOOSE_DEBUG
  mongoose.set('debug', true);                                                   // Activa modo debug de Mongoose
}

// Configura strictQuery (recomendado en Mongoose 7/8)                            // Evita consultas con campos no declarados en esquemas
mongoose.set('strictQuery', true);                                               // Aplica strictQuery a nivel global

// Lee la URI desde .env con fallback local                                       // Soporta conexión local si no hay MONGO_URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Procivil_Manager'; // Construye la URI de conexión

// Parámetros de reintento                                                        // Ajustes para reconectar en arranque
const MAX_RETRIES = Number(process.env.DB_MAX_RETRIES || 5);                     // Número máximo de reintentos (por defecto 5)
const BASE_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS || 1500);             // Retardo base entre reintentos (ms)

// Función de espera exponencial                                                  // Utilidad para retrasar entre reintentos
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));         // Retorna una promesa que resuelve tras ms

// Registra listeners de conexión                                                 // Encapsula registro de eventos de conexión
function registerConnectionEvents() {                                            // Declara función para suscribir eventos
  const conn = mongoose.connection;                                              // Obtiene el objeto de conexión actual

  conn.on('connected', () => {                                                   // Evento cuando se establece la conexión
    console.log('✅ MongoDB conectado');                                          // Log de éxito de conexión
  });                                                                             // Cierra listener de 'connected'

  conn.on('reconnected', () => {                                                 // Evento cuando Mongoose se reconecta
    console.log('🔁 MongoDB reconectado');                                        // Log de reconexión
  });                                                                             // Cierra listener de 'reconnected'

  conn.on('disconnected', () => {                                                // Evento cuando la conexión se cae
    console.warn('⚠️  MongoDB desconectado');                                     // Advertencia de desconexión
  });                                                                             // Cierra listener de 'disconnected'

  conn.on('error', (err) => {                                                    // Evento de error en la conexión
    console.error('❌ Error de MongoDB:', err?.message || err);                  // Log del error de conexión
  });                                                                             // Cierra listener de 'error'
}                                                                                 // Cierra función registerConnectionEvents

// Cierre ordenado de la conexión                                                 // Maneja señales del proceso para cerrar bien
async function gracefulShutdown(signal) {                                        // Declara función de apagado elegante
  try {                                                                          // Manejo de errores en cierre
    console.log(`🛑 Recibida señal ${signal}. Cerrando conexión MongoDB...`);     // Log de señal recibida
    await mongoose.connection.close();                                           // Cierra la conexión activa
    console.log('👋 Conexión MongoDB cerrada correctamente');                    // Confirma cierre exitoso
    process.exit(0);                                                             // Termina el proceso con código OK
  } catch (err) {                                                                // Si ocurre un error cerrando
    console.error('Error al cerrar MongoDB:', err);                              // Log del error
    process.exit(1);                                                             // Termina el proceso con error
  }                                                                               // Cierra catch
}                                                                                 // Cierra función gracefulShutdown

// Registra manejadores de señales del sistema                                    // Suscribe señales comunes para cierre
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));                         // Ctrl+C en terminal
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));                        // Terminación de proceso (PM2/Docker/etc)

// Función principal de conexión con reintentos                                   // Exportada para usarla en server.js
async function connectDB() {                                                     // Declara la función connectDB
  registerConnectionEvents();                                                    // Suscribe eventos de conexión

  let attempt = 0;                                                               // Inicializa contador de reintentos
  while (true) {                                                                 // Bucle hasta conectar o agotar reintentos
    try {                                                                        // Intenta conectar
      // Nota: en Mongoose 8 los flags useNewUrlParser/useUnifiedTopology ya no   // Comentario sobre opciones deprecadas
      // son necesarios; Mongoose maneja estas opciones por defecto.              // Explicación de compatibilidad
      await mongoose.connect(MONGO_URI);                                         // Intenta conexión con la URI
      const info = mongoose.connection;                                          // Obtiene info de conexión
      console.log(                                                               // Log de detalles de conexión
        `MONGO FUNCIONANDO → host:${info.host} db:${info.name} readyState:${info.readyState}` // Info útil para diagnóstico
      );                                                                         // Fin del log de detalles
      return;                                                                    // Sale de la función al conectar exitosamente
    } catch (error) {                                                            // Si falla la conexión
      attempt += 1;                                                              // Incrementa contador de intentos
      const delayMs = Math.min(BASE_DELAY_MS * attempt, 10000);                  // Calcula retardo con tope (10s)
      console.error(                                                             // Log del fallo con intento y próximo retardo
        `Intento ${attempt}/${MAX_RETRIES} de conexión a MongoDB fallido: ${error?.message || error}. Reintentando en ${delayMs}ms...`
      );                                                                         // Fin del log de error

      if (attempt >= MAX_RETRIES) {                                              // Si se alcanzó el máximo de reintentos
        console.error('No fue posible conectar a MongoDB tras múltiples intentos.'); // Log definitivo de fallo
        process.exit(1);                                                         // Termina el proceso con error
      }                                                                           // Cierra condición de límite
      await delay(delayMs);                                                      // Espera antes de reintentar
    }                                                                             // Cierra catch
  }                                                                               // Cierra while(true)
}                                                                                 // Cierra función connectDB

module.exports = connectDB;                                                      // Exporta la función para ser usada en server.js
