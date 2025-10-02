// File: BackEnd/scripts/2025-10-02_migrar_proyectos_fk.js                      // Ruta del archivo dentro del proyecto
// Descripción: Migra proyectos antiguos que usan "email" (string) y "team"     // Objetivo general del script
// como textos/emails hacia el nuevo esquema con "owner" y "team" referenciando // Convierte emails → ObjectId referenciando User
// al modelo User por ObjectId. Solo elimina "email" si el owner fue resuelto.   // Evita romper validación (owner es requerido)

const path = require('path');                                                   // Módulo nativo para resolver rutas de forma portátil
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });         // Carga .env del BackEnd usando __dirname (robusto en Win/Linux)

const mongoose  = require('mongoose');                                          // ODM para manejar conexión y operaciones en MongoDB
const Proyectos = require('../models/Proyectos');                               // Modelo Proyectos (owner/team como ObjectId)
const User      = require('../models/User');                                    // Modelo User (permite resolver emails → _id)

// Normaliza emails a lower + trim                                               // Utilidad para uniformar correos antes de buscar en BD
const normalizeEmail = (email) => (typeof email === 'string'                    // Si el valor es string…
  ? email.trim().toLowerCase()                                                  // …aplica trim + minúsculas
  : email);                                                                     // Si no es string, retorna el mismo valor

(async () => {                                                                  // IIFE asíncrona para poder usar await en nivel superior
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/Procivil_Manager'; // Toma MONGO_URI del .env o usa fallback local
  await mongoose.connect(uri);                                                  // Establece conexión con MongoDB

  // ───────────────────────────────────────────────────────────────────────────
  // Asegura índices CLAVE (fuera de transacción)                               // createIndex no debe ejecutarse dentro de una transacción
  // ───────────────────────────────────────────────────────────────────────────
  try {                                                                         // Bloque try/catch para índice de users.email
    await User.collection.createIndex(                                          // Crea índice en la colección 'users'
      { email: 1 },                                                             // Índice por el campo email ascendente
      { unique: true, collation: { locale: 'es', strength: 2 } }                // Único + collation ES (case/acento-insensible)
    );                                                                          // Fin createIndex users.email
  } catch (e) {                                                                 // Si ya existe o hay conflicto…
    console.warn('Aviso índice users.email:', e?.message);                      // …solo mostramos aviso (no interrumpe migración)
  }

  try {                                                                         // Bloque try/catch para índice compuesto en proyectos
    await Proyectos.collection.createIndex(                                     // Crea índice en la colección 'proyectos'
      { owner: 1, title: 1 },                                                   // Índice compuesto por owner y title
      { unique: true, collation: { locale: 'es', strength: 2 } }                // Único + collation ES
    );                                                                          // Fin createIndex proyectos.{owner,title}
  } catch (e) {                                                                 // Si ya existe o hay conflicto…
    console.warn('Aviso índice proyectos.{owner,title}:', e?.message);          // …solo mostramos aviso (no interrumpe migración)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Inicio de sesión/transacción para la migración de documentos               // Transacción = cambios atómicos/más seguros
  // ───────────────────────────────────────────────────────────────────────────
  const session = await mongoose.startSession();                                // Abre una sesión de Mongo
  session.startTransaction();                                                   // Inicia la transacción

  try {                                                                         // Bloque principal protegido con try/catch
    // NOTA: si esperas MUCHOS documentos, considera usar cursor:               // Sugerencia para grandes volúmenes
    // const cursor = Proyectos.find().cursor({ session }); for await (const p of cursor) { … } // Alternativa con streaming

    const proyectos = await Proyectos.find().session(session);                  // Carga todos los proyectos dentro de la sesión

    let migradosOwner    = 0;                                                   // Contador: proyectos que asignaron owner
    let migradosTeam     = 0;                                                   // Contador: proyectos con team convertido a ObjectId
    let sinOwner         = 0;                                                   // Contador: proyectos cuyo owner (por email) no se pudo resolver
    let sinTeamRes       = 0;                                                   // Contador: miembros de team no resueltos (email sin usuario)
    let emailsEliminados = 0;                                                   // Contador: proyectos a los que se eliminó el campo email
    let sinCambios       = 0;                                                   // Contador: proyectos que no requirieron modificación

    for (const p of proyectos) {                                                // Itera cada proyecto
      let mod = false;                                                          // Bandera: indica si el documento sufrió cambios
      let ownerResuelto = Boolean(p.owner);                                     // Marca si ya tiene owner (ObjectId) válido

      // Paso 1: Migrar "email" (string) → "owner" (ObjectId)                   // Convierte el owner heredado en texto a referencia User
      if (!ownerResuelto && p.email) {                                          // Aplica solo si NO hay owner y SÍ hay email heredado
        const correo = normalizeEmail(p.email);                                 // Normaliza el email heredado
        const u = await User.findOne({ email: correo }).session(session);       // Busca usuario por ese email (en la misma sesión)
        if (u) {                                                                // Si el usuario existe…
          p.owner = u._id;                                                      // …asigna el _id como owner del proyecto
          migradosOwner++;                                                      // Incrementa contador de owners migrados
          ownerResuelto = true;                                                 // Marca como resuelto
          mod = true;                                                           // Documento fue modificado
        } else {                                                                // Si NO se encontró usuario para ese email…
          sinOwner++;                                                           // …requiere intervención manual (no migramos email aún)
        }                                                                       // Fin if usuario encontrado
      }                                                                         // Fin Paso 1

      // Paso 2: Migrar "team" de strings/emails → Array<ObjectId>              // Convierte el team heredado (si venía con emails)
      if (Array.isArray(p.team) && p.team.length) {                             // Solo si team existe y tiene elementos
        const arr = p.team;                                                     // Referencia al arreglo de team
        const looksString = typeof arr[0] === 'string';                         // Detecta si los elementos parecen strings/emails
        if (looksString) {                                                      // Si el team está en formato textual…
          const emails = arr                                                    // Construye arreglo de emails normalizados
            .map(e => normalizeEmail(String(e)))                                // Aplica normalización a cada elemento
            .filter(e => e.includes('@'));                                      // Filtra solo los que parecen emails
          if (emails.length) {                                                  // Si hay posibles emails…
            const users = await User.find({ email: { $in: emails } })           // Busca usuarios cuyos correos estén en el set
                                 .session(session);                              // Consulta en la misma sesión
            const mapEmailToId = new Map(users.map(u => [u.email, u._id]));     // Mapea email → _id para resolver rápido

            const resolved = emails                                             // Recorre emails originales
              .map(e => mapEmailToId.get(e))                                    // Obtiene _id si existe usuario
              .filter(Boolean);                                                 // Filtra los que no se resolvieron

            if (resolved.length) {                                              // Si resolvió al menos uno…
              p.team = Array.from(new Set(resolved));                           // Deduplica y asigna arreglo de ObjectId
              migradosTeam++;                                                   // Incrementa contador de team migrado
              mod = true;                                                       // Documento fue modificado
            }                                                                   
            if (resolved.length !== emails.length) {                             // Si no pudo resolver todos…
              sinTeamRes += (emails.length - resolved.length);                   // Acumula cuántos quedaron sin resolver
            }                                                                   
          }                                                                      // Fin if emails.length
        }                                                                        // Fin if looksString
      }                                                                          // Fin Paso 2

      // Paso 3: Eliminar "email" SOLO si owner quedó resuelto                   // Evita violar 'required' de owner
      if (ownerResuelto && typeof p.email !== 'undefined') {                     // Solo si ya tenemos owner válido
        p.email = undefined;                                                     // Elimina el campo legado 'email'
        emailsEliminados++;                                                      // Incrementa contador de emails eliminados
        mod = true;                                                              // Documento fue modificado
      }                                                                          // Fin Paso 3

      // Paso 4: Guardar si hubo cambios                                         // Persiste las modificaciones del documento
      if (mod) {                                                                 // Si el documento cambió…
        await p.save({ session });                                               // …guárdalo dentro de la transacción
      } else {                                                                   // Si no hubo cambios…
        sinCambios++;                                                            // …incrementa contador de “sin cambios”
      }                                                                          // Fin if mod
    }                                                                            // Fin for proyectos

    await session.commitTransaction();                                           // Confirma la transacción (aplica todos los cambios)
    session.endSession();                                                        // Cierra la sesión asociada

    console.log('Migración completada ✅');                                      // Log de éxito
    console.log(`Proyectos con owner migrado: ${migradosOwner}`);                // Resumen: owners migrados
    console.log(`Proyectos con team convertido: ${migradosTeam}`);               // Resumen: teams convertidos
    console.log(`Proyectos sin owner resoluble: ${sinOwner}`);                   // Resumen: casos a revisar manualmente
    console.log(`Miembros de team no resueltos: ${sinTeamRes}`);                 // Resumen: miembros sin usuario
    console.log(`Proyectos con 'email' eliminado: ${emailsEliminados}`);         // Resumen: campos email eliminados
    console.log(`Proyectos sin cambios: ${sinCambios}`);                         // Resumen: documentos que no requerían cambios

    await mongoose.disconnect();                                                 // Cierra la conexión con MongoDB
    process.exit(0);                                                             // Sale del proceso con código OK
  } catch (err) {                                                                // Si ocurre un error durante la migración…
    await session.abortTransaction();                                            // Revierte la transacción (deshace cambios parciales)
    session.endSession();                                                        // Cierra la sesión
    console.error('Error en migración ❌:', err);                                // Log del error para diagnóstico
    await mongoose.disconnect();                                                 // Cierra la conexión con MongoDB
    process.exit(1);                                                             // Sale del proceso con código de error
  }                                                                              // Fin try/catch principal
})();                                                                            // Ejecuta la IIFE inmediatamente
