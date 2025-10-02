// File: BackEnd/scripts/2025-10-02_fix_indexes.js                                 // Ruta del archivo dentro del proyecto
// Descripción: Lista y limpia índices duplicados en "users" y "proyectos".        // Propósito del script
// Mantiene exactamente UN índice por clave (email, role, status, owner+title)     // Criterio: conservar índice "deseado" y eliminar redundantes
// y crea los que falten según la especificación deseada.                          // También crea índices faltantes

const path = require('path');                                                      // Importa 'path' para resolver rutas absolutas con __dirname
require('dotenv').config({                                                         // Carga variables de entorno desde .env del BackEnd
  path: path.resolve(__dirname, '../.env'),                                        // Usa __dirname para que funcione igual en Win/Linux/Mac
});                                                                                // Fin carga .env

const mongoose = require('mongoose');                                              // Importa Mongoose para conectar y operar con MongoDB

const APPLY = process.argv.includes('--apply');                                    // Bandera CLI: si se pasa --apply, aplica cambios (drop/create)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Procivil_Manager'; // URI de Mongo: .env o fallback local

// Definición de los índices que queremos que existan por colección                // Mapa "índices deseados"
const DESIRED = {                                                                  // Abre objeto DESIRED
  users: [                                                                          // Colección 'users'
    { key: { email: 1 }, unique: true, collation: { locale: 'es', strength: 2 } }, // email único con collation ES
    { key: { role: 1 } },                                                           // índice auxiliar por rol (no único)
  ],                                                                                // Cierra users
  proyectos: [                                                                      // Colección 'proyectos'
    { key: { owner: 1, title: 1 }, unique: true, collation: { locale: 'es', strength: 2 } }, // compuesto único owner+title
    { key: { status: 1 } },                                                         // índice auxiliar por estado (no único)
  ],                                                                                // Cierra proyectos
};                                                                                  // Cierra DESIRED

// Normaliza la "key" del índice a una cadena estable                               // Útil para detectar duplicados por misma clave
function normalizeKey(keyObj = {}) {                                               // Define normalizeKey
  const entries = Object.entries(keyObj)                                           // Toma pares [campo, orden]
    .sort(([a], [b]) => a.localeCompare(b));                                       // Ordena por nombre de campo para consistencia
  return entries.map(([k, v]) => `${k}:${v}`).join('|');                           // Retorna "campo:orden|campo:orden"
}                                                                                  // Fin normalizeKey

// Verifica si un índice existente "idx" coincide con la spec deseada "spec"        // Compara key, unique y collation
function matchesDesired(idx, spec) {                                               // Define matchesDesired
  if (normalizeKey(idx.key) !== normalizeKey(spec.key)) return false;              // La key debe coincidir
  if (Boolean(idx.unique) !== Boolean(spec.unique)) return false;                  // Unicidad debe coincidir
  const sCol = spec.collation || null;                                             // Collation deseada (o null)
  const iCol = idx.collation || null;                                              // Collation actual (o null)
  if (Boolean(sCol) !== Boolean(iCol)) return false;                               // Ambos deben tener (o no) collation
  if (sCol && iCol) {                                                              // Si ambos tienen collation…
    if (sCol.locale !== iCol.locale) return false;                                 // …compara locale
    if (Number(sCol.strength) !== Number(iCol.strength)) return false;             // …compara strength
  }                                                                                // Fin comparación collation
  return true;                                                                     // Coincide con la spec
}                                                                                  // Fin matchesDesired

// Busca dentro de DESIRED la spec para una "key" dada                              // Ayuda a decidir qué índice mantener
function findDesiredSpecForKey(collName, keyObj) {                                 // Define findDesiredSpecForKey
  const wanted = DESIRED[collName] || [];                                          // Toma specs para la colección
  return wanted.find(spec => normalizeKey(spec.key) === normalizeKey(keyObj))      // Busca por key normalizada
    || null;                                                                       // Retorna spec o null si no hay
}                                                                                  // Fin findDesiredSpecForKey

// Procesa una colección: lista, detecta duplicados, (opcional) limpia y asegura    // Lógica por colección
async function processCollection(collName) {                                       // Define processCollection
  const coll = mongoose.connection.db.collection(collName);                        // Referencia a la colección nativa

  let indexes;                                                                      // Variable para alojar índices existentes
  try {                                                                             // Intenta listar índices
    indexes = await coll.indexes();                                                 // Obtiene índices con metadatos
  } catch (err) {                                                                   // Si hay error (ej: ns no existe)
    if (String(err?.message || '').includes('ns does not exist')) {                 // Detecta "namespace does not exist"
      console.warn(`⚠️  La colección "${collName}" no existe aún. Saltando…`);      // Advierte y salta
      return;                                                                       // No hay nada que procesar
    }                                                                               // Fin if ns no existe
    throw err;                                                                      // Re-lanza errores desconocidos
  }                                                                                 // Fin try/catch indexes

  console.log(`\n📚 Colección "${collName}" — índices actuales:`);                 // Encabezado de listado
  indexes.forEach(ix =>                                                            // Recorre cada índice
    console.log('   •', ix.name, JSON.stringify(ix.key),                           // Muestra nombre y key
      JSON.stringify({ unique: ix.unique, collation: ix.collation }))              // Muestra flags clave
  );                                                                               // Fin forEach

  // Agrupa por key normalizada para encontrar duplicados                          // Detección de duplicados
  const groups = new Map();                                                        // Mapa keyNorm → [índices]
  for (const ix of indexes) {                                                      // Recorre índices
    const k = normalizeKey(ix.key);                                                // Normaliza la key
    if (!groups.has(k)) groups.set(k, []);                                         // Crea grupo si no existe
    groups.get(k).push(ix);                                                        // Agrega índice al grupo
  }                                                                                // Fin for índices

  // Por cada grupo con más de un índice, decide a quién mantener/eliminar         // Resolución de duplicados
  for (const [keyNorm, group] of groups.entries()) {                               // Recorre grupos
    if (group.length <= 1) continue;                                               // Si no hay duplicados, sigue
    console.log(`\n🔎 Duplicados detectados en "${collName}" para key [${keyNorm}]:`); // Log de duplicados
    group.forEach(ix =>                                                            // Lista cada duplicado
      console.log('   -', ix.name, JSON.stringify({ unique: ix.unique, collation: ix.collation }))
    );                                                                             // Fin forEach duplicados

    const desiredForThisKey = findDesiredSpecForKey(collName, group[0].key);       // Busca spec deseada para esa key
    const keep = desiredForThisKey                                                 // El índice a conservar…
      ? (group.find(ix => matchesDesired(ix, desiredForThisKey)) || group[0])      // …el que mejor coincide con la spec
      : group[0];                                                                   // …o el primero si no hay spec

    const dropList = group.filter(ix => ix.name !== keep.name);                     // Índices a eliminar (todos menos el elegido)
    console.log('   ✅ Mantener:', keep.name);                                      // Log del que se conservará
    dropList.forEach(ix => console.log('   🗑️  Eliminar:', ix.name));              // Log de los que se eliminarán

    if (APPLY) {                                                                    // Si modo aplicar está activo…
      for (const ix of dropList) {                                                  // Recorre índices a eliminar
        try {                                                                        // Maneja errores individuales
          await coll.dropIndex(ix.name);                                             // Dropea el índice duplicado
          console.log(`   ✔ Dropped index: ${ix.name}`);                             // Log de éxito
        } catch (err) {                                                              // Si falla drop
          console.error(`   ✖ Error al eliminar ${ix.name}:`, err?.message || err);  // Log de error
        }                                                                            // Fin catch
      }                                                                              // Fin for dropList
    } else {                                                                         // Si es simulación…
      console.log('   (Simulación) No se han aplicado cambios. Usa --apply para ejecutar.'); // Mensaje
    }                                                                                // Fin APPLY
  }                                                                                  // Fin for groups

  // Garantiza que existan los índices deseados                                    // Crea los que falten
  const desiredList = DESIRED[collName] || [];                                      // Lista de specs deseadas para la colección
  for (const spec of desiredList) {                                                 // Recorre cada spec deseada
    const exists = indexes.some(ix => matchesDesired(ix, spec));                    // Verifica si ya existe tal cual
    if (!exists) {                                                                  // Si falta…
      console.log(`\n➕ Falta índice deseado en "${collName}":`, JSON.stringify(spec)); // Informa el faltante
      if (APPLY) {                                                                  // Si modo aplicar…
        try {                                                                        // Maneja errores de creación
          await coll.createIndex(spec.key, { unique: spec.unique, collation: spec.collation }); // Crea índice
          console.log('   ✔ createIndex aplicado');                                  // Log de éxito
        } catch (err) {                                                              // Error en createIndex
          console.error('   ✖ Error al crear índice:', err?.message || err);         // Log de error
        }                                                                            // Fin catch
      } else {                                                                       // Si simulación…
        console.log('   (Simulación) No se han creado índices. Usa --apply para ejecutar.'); // Mensaje
      }                                                                              // Fin APPLY
    }                                                                                // Fin if !exists
  }                                                                                  // Fin for desiredList
}                                                                                    // Fin processCollection

// Orquestación principal: conecta, procesa y cierra                                // IIFE principal
(async () => {                                                                       // Abre IIFE asíncrona
  console.log(`🔧 Conectando a MongoDB: ${MONGO_URI ? '[MONGO_URI de .env]' : '[fallback local]'}`); // Log (sin exponer URI)
  await mongoose.connect(MONGO_URI);                                                // Conecta a MongoDB usando la URI
  try {                                                                              // Bloque principal try
    await processCollection('users');                                               // Procesa colección 'users'
    await processCollection('proyectos');                                           // Procesa colección 'proyectos'
    console.log(`\n${APPLY ? '✅ Cambios aplicados' : '🧪 Simulación completada (sin cambios)'}\n`); // Resumen final
    process.exit(0);                                                                 // Sale con éxito
  } catch (err) {                                                                    // Captura errores del flujo
    console.error('❌ Error en el proceso:', err?.message || err);                   // Log de error
    process.exit(1);                                                                 // Sale con código de error
  } finally {                                                                        // Bloque finally (siempre)
    await mongoose.connection.close();                                               // Cierra conexión a MongoDB
  }                                                                                  // Fin finally
})();                                                                                // Ejecuta IIFE inmediatamente
