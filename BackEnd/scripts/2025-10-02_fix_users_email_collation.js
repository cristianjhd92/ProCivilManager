// File: BackEnd/scripts/2025-10-02_fix_users_email_collation.js                 // Ruta del archivo dentro del proyecto
// Descripción: Asegura que el índice único en users.email use collation ES       // Propósito del script
// (insensible a mayúsculas/acentos).                                             // Resultado esperado

const path = require('path');                                                    // Módulo nativo para manejar rutas
require('dotenv').config({                                                       // Carga variables de entorno
  path: path.resolve(__dirname, '../.env'),                                      // Usa BackEnd/.env (independiente del cwd)
  override: true                                                                 // Permite sobreescribir si ya existían
});                                                                              // Fin carga .env

const mongoose = require('mongoose');                                            // ODM para MongoDB

// -------- Config básica CLI --------                                            // Sección de configuración por CLI
const APPLY = process.argv.includes('--apply');                                  // Bandera --apply para ejecutar cambios
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Procivil_Manager'; // URI de conexión

// Normaliza la "key" de índice a una cadena estable                              // Helper para comparar claves de índices
function normalizeKey(keyObj = {}) {                                             // Recibe objeto de clave
  const entries = Object.entries(keyObj).sort(([a], [b]) => a.localeCompare(b)); // Ordena por nombre de campo
  return entries.map(([k, v]) => `${k}:${v}`).join('|');                         // Devuelve "campo:orden|campo:orden"
}                                                                                // Cierra normalizeKey

(async () => {                                                                   // IIFE asíncrona principal
  // --- Conectar a MongoDB ---
  console.log('🔧 Conectando a MongoDB:',                                         // Log de conexión (sin exponer secretos)
    MONGO_URI.includes('@') ? '*** (Atlas URI detectada) ***' : MONGO_URI);       // Muestra si es Atlas o local
  await mongoose.connect(MONGO_URI);                                             // Abre conexión

  try {                                                                          // Bloque try/catch principal
    const coll = mongoose.connection.db.collection('users');                     // Obtiene la colección "users"

    // --- Paso 1: detectar duplicados bajo collation ES/strength:2 ---
    console.log('\n🔍 Buscando posibles duplicados de email (collation ES, strength:2)...'); // Log informativo
    const duplicates = await coll.aggregate(                                     // Agregación para detectar duplicados
      [
        { $group: {                                                              // Agrupa por el campo email
          _id: '$email',                                                         // _id del grupo = email (colacionado)
          ids: { $push: '$_id' },                                                // Junta _id de los docs del grupo
          emails: { $push: '$email' },                                           // Junta las cadenas de email originales
          count: { $sum: 1 }                                                     // Cuenta elementos por grupo
        }},
        { $match: { count: { $gt: 1 } } }                                        // Nos quedamos con grupos con más de 1
      ],
      { collation: { locale: 'es', strength: 2 } }                               // ¡Clave!: agrupa con collation ES insensible a mayúsculas/acentos
    ).toArray();                                                                  // Convierte cursor a arreglo

    if (duplicates.length > 0) {                                                 // Si hay duplicados colacionados
      console.log('⚠️  Se encontraron correos en conflicto para collation ES:'); // Aviso
      duplicates.forEach((dup, i) => {                                           // Recorre cada grupo duplicado
        console.log(`   #${i + 1}`, dup.emails);                                 // Muestra los emails tal cual están guardados
      });                                                                         // Fin forEach
      console.log('\n🛑 No se modificó el índice. Debes resolver/normalizar estos emails'); // Instrucción
      console.log('   (ej. unificar a minúsculas) antes de recrear el índice con collation.'); // Sugerencia
      process.exit(2);                                                            // Sale con código distinto de éxito
    }                                                                             // Fin if duplicates

    // --- Paso 2: listar índices actuales ---
    const indexes = await coll.indexes();                                        // Lista índices de la colección
    console.log('\n📚 Índices actuales en "users":');                             // Encabezado
    indexes.forEach(ix =>                                                        // Recorre índices
      console.log('   •', ix.name, JSON.stringify(ix.key),                       // Muestra nombre + clave
        JSON.stringify({ unique: ix.unique, collation: ix.collation }))          // Muestra opciones relevantes
    );                                                                            // Fin forEach

    // Busca el índice actual por key { email: 1 }
    const emailIdx = indexes.find(ix => normalizeKey(ix.key) === 'email:1');     // Ubica índice de email (si existe)

    // Si ya existe con la collation deseada y unique: true → nada que hacer
    const hasDesired =
      emailIdx &&
      emailIdx.unique === true &&
      emailIdx.collation &&
      emailIdx.collation.locale === 'es' &&
      Number(emailIdx.collation.strength) === 2;                                 // Comprueba que ya cumpla

    if (hasDesired) {                                                             // Si ya está bien
      console.log('\n✅ El índice unique {email:1} YA tiene collation ES (strength:2). No hay nada que hacer.'); // Mensaje de OK
      process.exit(0);                                                            // Exit OK
    }                                                                             // Fin if hasDesired

    // Si no existe el índice o existe sin la collation deseada → recrearlo
    console.log('\n🧭 Objetivo: unique { email: 1 } con collation { locale:"es", strength:2 }'); // Objetivo del script
    if (!APPLY) {                                                                 // Modo simulación
      console.log('🧪 Simulación: se eliminaría el índice actual (si existe) y se recrearía con la collation deseada.'); // Mensaje
      console.log('   Ejecuta con --apply para aplicar los cambios.');            // Instrucción
      process.exit(0);                                                            // Exit OK (simulación)
    }                                                                             // Fin simulación

    // --- Paso 3: aplicar cambios (drop + create) ---
    if (emailIdx) {                                                               // Si existe índice "viejo"
      try {                                                                       // Intento de drop
        await coll.dropIndex(emailIdx.name);                                      // Elimina el índice por nombre
        console.log(`✔ Eliminado índice existente: ${emailIdx.name}`);            // Log de éxito
      } catch (err) {                                                             // Error al eliminar
        console.error('✖ Error al eliminar índice actual:', err?.message || err); // Log de error
        process.exit(1);                                                          // Exit error
      }                                                                           // Fin catch
    }                                                                             // Fin si había índice

    try {                                                                         // Intento de createIndex
      await coll.createIndex(                                                     // Crea índice deseado
        { email: 1 },                                                             // Clave
        { unique: true, collation: { locale: 'es', strength: 2 }, name: 'email_1' } // Opciones + nombre estable
      );                                                                          // Fin createIndex
      console.log('✅ Índice creado: email_1 (unique, collation ES strength:2).'); // Log de éxito
    } catch (err) {                                                               // Error al crear
      console.error('✖ Error al crear índice con collation:', err?.message || err); // Log de error
      console.error('   Sugerencia: vuelve a ejecutar en modo simulación y revisa posibles conflictos.'); // Pista
      process.exit(1);                                                            // Exit error
    }                                                                             // Fin catch

    console.log('\n🎉 Proceso completado.');                                       // Mensaje final
    process.exit(0);                                                               // Exit OK
  } catch (err) {                                                                  // Catch global
    console.error('❌ Error en el proceso:', err?.message || err);                 // Log de error
    process.exit(1);                                                               // Exit error
  } finally {                                                                      // Bloque siempre
    await mongoose.connection.close();                                             // Cierra conexión
  }                                                                                // Fin finally
})();                                                                              // Ejecuta la IIFE
