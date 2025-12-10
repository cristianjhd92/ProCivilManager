// File: BackEnd/src/config/conexionBaseDatos.js
// Description: Módulo de conexión a MongoDB usando Mongoose 8.
//              Expone una función async que establece la conexión
//              y finaliza el proceso si ocurre un error crítico.

// 🔹 Importamos Mongoose (ODM para trabajar con MongoDB desde Node.js)
const mongoose = require('mongoose');

// 🔹 Definimos la URI de conexión a MongoDB
//     - En producción debe venir desde la variable de entorno MONGO_URI.
//     - En desarrollo, si no existe MONGO_URI, se usa una base local por defecto.
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Procivil_Manager';

/**
 * Función que establece la conexión con MongoDB.
 * Se llama una vez desde server.js antes de levantar el servidor HTTP.
 */
const connectDB = async () => {
  try {
    // 🔹 Intentamos conectar a MongoDB usando la URI definida.
    //     - A partir de Mongoose 6/7/8 ya no es necesario pasar opciones
    //       como useNewUrlParser o useUnifiedTopology: vienen por defecto.
    await mongoose.connect(MONGO_URI);

    // 🔹 Extraemos algunos datos de la conexión activa para el log.
    const { host, name } = mongoose.connection;

    // 🔹 Mensaje de éxito en consola con host y nombre de la base.
    console.log(`MongoDB conectado: ${host}/${name}`);
  } catch (error) {
    // 🔹 Si ocurre un error en la conexión inicial, lo mostramos en consola.
    console.error('Error al conectar MongoDB:', error.message);

    // 🔹 Cortamos el proceso con código 1 (error) para no dejar el servidor "cojo".
    process.exit(1);
  }

  // 🔹 Listeners adicionales para monitorear el estado de la conexión.
  //     Estos no son estrictamente necesarios pero ayudan al diagnóstico.
  mongoose.connection.on('error', (err) => {
    console.error('⚠️ Error en la conexión de MongoDB:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ Conexión con MongoDB perdida (disconnected).');
  });
};

// 🔹 Exportamos la función para poder usarla en server.js y otros módulos.
module.exports = connectDB;
