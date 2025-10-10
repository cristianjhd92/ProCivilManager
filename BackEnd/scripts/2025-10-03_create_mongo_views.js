// File: BackEnd/scripts/2025-10-03_create_mongo_views.js                         // Ruta del script dentro del proyecto
// Descripción: Crea/actualiza/elimina "vistas" de MongoDB (views) para           // Propósito del script
//             respaldar el punto de checklist de "vistas/consultas agregadas".   // Contexto
// Uso:                                                                            // Cómo se ejecuta
//   node BackEnd/scripts/2025-10-03_create_mongo_views.js --apply                //   Crea o actualiza las vistas
//   node BackEnd/scripts/2025-10-03_create_mongo_views.js --drop                 //   Elimina las vistas creadas
// Requisitos: MONGO_URI en .env y colección 'proyectos' existente.               // Prerrequisitos

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); // Carga variables de entorno del BackEnd/.env
const mongoose = require('mongoose');                                              // Importa Mongoose para manejar la conexión con MongoDB

// ------------------------------- Definición de vistas -------------------------------
const VIEWS = [                                                                    // Arreglo con las definiciones de cada vista a crear
  {                                                                                // ===== Vista 1: Resumen por estado/tipo/prioridad =====
    name: 'vw_proyectos_resumen',                                                  // Nombre de la "vista" (colección de solo lectura)
    on: 'proyectos',                                                               // Colección base sobre la que se proyecta la vista
    pipeline: [                                                                    // Pipeline de agregación que define la vista
      {                                                                            // Única etapa del pipeline: $facet para paralelizar subconsultas
        $facet: {                                                                  // Ejecuta varias agregaciones en paralelo y devuelve un doc con llaves
          byStatus:   [ { $group: { _id: { $ifNull: ['$status', '(sin)'] }, count: { $sum: 1 } } } ], // Conteo por estado (con '(sin)' si nulo)
          byType:     [ { $group: { _id: { $ifNull: ['$type', '(sin)'] },   count: { $sum: 1 } } } ], // Conteo por tipo (maneja nulos)
          byPriority: [ { $group: { _id: { $ifNull: ['$priority', '(sin)'] }, count: { $sum: 1 } } } ] // Conteo por prioridad
        }                                                                          // Fin $facet
      }                                                                            // Fin etapa
    ]                                                                              // Fin pipeline
  },                                                                               // ===== Fin vista 1 =====
  {                                                                                // ===== Vista 2: Serie mensual últimos 12 meses =====
    name: 'vw_proyectos_mensual_12m',                                              // Nombre de la vista
    on: 'proyectos',                                                               // Colección base
    pipeline: [                                                                    // Pipeline para agrupar por año/mes
      {                                                                            // Etapa 1: filtra ventana temporal (≈ últimos 12 meses)
        $match: {                                                                  // Filtro por createdAt (desde el 1er día de hace 11 meses)
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) // Fecha mínima (inicio de la ventana)
          }
        }
      },
      {                                                                            // Etapa 2: agrupa por año y mes de createdAt
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },        // Clave de grupo: año y mes
          count: { $sum: 1 },                                                       // Número de proyectos en el mes
          sumBudget: { $sum: { $ifNull: ['$budget', 0] } }                          // Suma de presupuesto (0 si nulo)
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } }                                        // Etapa 3: ordena cronológicamente ascendente
    ]                                                                              // Fin pipeline
  },                                                                               // ===== Fin vista 2 =====
  {                                                                                // ===== Vista 3: Top owners por # y presupuesto =====
    name: 'vw_top_owners',                                                         // Nombre de la vista
    on: 'proyectos',                                                               // Colección base
    pipeline: [                                                                    // Pipeline para ranking de owners
      {                                                                            // Etapa 1: agrupar por owner (_id)
        $group: {
          _id: '$owner',                                                           // Clave de agrupación: ObjectId del owner
          count: { $sum: 1 },                                                      // Cantidad de proyectos que posee
          sumBudget: { $sum: { $ifNull: ['$budget', 0] } }                         // Presupuesto acumulado
        }
      },
      { $sort: { count: -1, sumBudget: -1 } },                                     // Etapa 2: ordena por count y luego por sumBudget (desc)
      { $limit: 5 }                                                                // Etapa 3: limita a Top 5
    ]                                                                              // Fin pipeline
  }                                                                                // ===== Fin vista 3 =====
];                                                                                 // ---------------------- Fin definiciones de vistas ----------------------

// ------------------------------------- Main -------------------------------------
async function run() {                                                             // Función principal autoejecutable
  const uri = process.env.MONGO_URI;                                               // Lee la cadena de conexión desde variables de entorno
  if (!uri) {                                                                      // Verifica que exista MONGO_URI
    console.error('❌ MONGO_URI no definido en .env');                              // Log de error si falta
    process.exit(1);                                                               // Termina el proceso con error
  }
  await mongoose.connect(uri, { dbName: undefined });                              // Abre conexión (db se toma del URI completo)
  const db = mongoose.connection.db;                                               // Obtiene el handle nativo de la base de datos

  const drop  = process.argv.includes('--drop');                                   // Bandera CLI: elimina vistas
  const apply = process.argv.includes('--apply');                                  // Bandera CLI: crea/actualiza vistas

  if (!drop && !apply) {                                                           // Si no se provee ninguna bandera
    console.log('ℹ️  Ejecuta con --apply para crear/actualizar vistas o --drop para eliminarlas.'); // Mensaje de ayuda
    await mongoose.disconnect();                                                   // Cierra la conexión
    return;                                                                        // Sale sin hacer cambios
  }

  for (const v of VIEWS) {                                                         // Itera por cada definición de vista
    try {                                                                          // Manejo de errores por vista
      if (drop) {                                                                  // Si se solicitó eliminar
        try {                                                                      // Intenta eliminar la colección-vista
          await db.dropCollection(v.name);                                         // Elimina la vista (si existe)
          console.log(`🗑️  Vista eliminada: ${v.name}`);                            // Log OK
        } catch (e) {                                                              // Si falla el drop
          if (String(e.message || '').includes('ns not found')) {                  // Si no existía la vista
            console.log(`↪️  Vista no existía: ${v.name}`);                         // Log informativo
          } else {                                                                  // Otro tipo de error
            throw e;                                                                // Re-lanza para cortar ejecución
          }
        }
      }

      if (apply) {                                                                 // Si se solicitó crear/actualizar
        try { await db.dropCollection(v.name); } catch (_) {}                      // Intenta dropear primero (idempotente)
        await db.createCollection(v.name, { viewOn: v.on, pipeline: v.pipeline }); // Crea la vista con viewOn + pipeline
        console.log(`✅ Vista creada/actualizada: ${v.name} (viewOn=${v.on})`);     // Log OK
      }
    } catch (err) {                                                                // Captura cualquier error durante el procesamiento de la vista
      console.error(`❌ Error procesando vista ${v.name}:`, err);                  // Log del error
      process.exit(1);                                                             // Termina el script con error
    }
  }

  await mongoose.disconnect();                                                     // Cierra la conexión con MongoDB
  console.log('✔️  Finalizado.');                                                  // Log final de éxito
}                                                                                  // Fin de run()

run().catch((e) => {                                                               // Invoca la función principal y captura errores no manejados
  console.error(e);                                                                // Log del error global
  process.exit(1);                                                                 // Sale con código de error
});                                                                                // Fin de invocación
