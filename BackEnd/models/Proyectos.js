// File: BackEnd/models/Proyectos.js                                             // Ruta del archivo dentro del proyecto
// Descripción: Esquema de Proyectos con integridad referencial (FK lógicas)      // Propósito del archivo
// hacia User, validadores de existencia, normalización de campos y un            // Qué hace: valida referencias, normaliza y define índices
// set de índices único/compuesto SIN duplicados.                                  // Evita índices duplicados (status/owner)

const mongoose = require('mongoose');                                            // Importa mongoose
const { Schema, model } = mongoose;                                              // Desestructura helpers

// -----------------------------------------------------------------------------
// Definición del esquema
// -----------------------------------------------------------------------------
const ProyectoSchema = new Schema({                                              // Crea un nuevo Schema de proyecto
  title: {                                                                       // Título del proyecto
    type: String,                                                                // Tipo String
    required: true,                                                              // Obligatorio
    trim: true                                                                   // Recorta espacios
  },
  owner: {                                                                       // Propietario (FK lógica a User)
    type: Schema.Types.ObjectId,                                                 // ObjectId
    ref: 'User',                                                                 // Referencia al modelo User
    required: true                                                               // Obligatorio (NO usar index aquí: lo cubre el índice compuesto)
  },
  client: {                                                                      // Cliente opcional (FK lógica a User)
    type: Schema.Types.ObjectId,                                                 // ObjectId
    ref: 'User',                                                                 // Referencia al modelo User
    default: null                                                                // Puede estar vacío
  },
  team: [{                                                                       // Equipo de trabajo (FK lógicas a User)
    type: Schema.Types.ObjectId,                                                 // Cada elemento es un ObjectId
    ref: 'User'                                                                  // Referencia a User
  }],
  location: {                                                                    // Ubicación (texto libre)
    type: String,                                                                // Tipo String
    trim: true                                                                   // Recorta espacios
  },
  type: {                                                                        // Tipo de proyecto (texto libre)
    type: String,                                                                // Tipo String
    trim: true                                                                   // Recorta espacios
  },
  budget: {                                                                      // Presupuesto
    type: Number,                                                                // Tipo numérico
    min: 0                                                                       // No permite negativos
  },
  duration: {                                                                    // Duración (definir unidad en UI: días/semanas)
    type: Number,                                                                // Tipo numérico
    min: 0                                                                       // No permite negativos
  },
  description: {                                                                 // Descripción
    type: String,                                                                // Tipo String
    trim: true                                                                   // Recorta espacios
  },
  priority: {                                                                    // Prioridad
    type: String,                                                                // Tipo String
    enum: ['baja', 'media', 'alta'],                                             // Valores permitidos
    default: 'media'                                                             // Valor por defecto
  },
  status: {                                                                      // Estado del proyecto
    type: String,                                                                // Tipo String
    // Importante: usamos los mismos valores que en controladores para evitar     // Nota: consistencia con controladores
    // errores de validación (antes se usaba 'planning' por defecto).             // Explicación del porqué
    enum: ['planning', 'in-progress', 'paused', 'done', 'canceled'],             // Estatus válidos (EN)
    default: 'planning'                                                          // Valor por defecto (EN)
    // NO poner index: true aquí para evitar un índice duplicado de status       // Evita duplicidad de índices
  },
  startDate: {                                                                   // Fecha de inicio
    type: Date                                                                   // Tipo fecha
  },
  endDate: {                                                                     // Fecha de fin
    type: Date                                                                   // Tipo fecha
  },
  progress: {                                                                    // Avance (%)
    type: Number,                                                                // Tipo numérico
    min: 0,                                                                      // Mínimo 0
    max: 100,                                                                    // Máximo 100
    default: 0                                                                   // Por defecto 0
  }
}, {
  timestamps: true,                                                              // Crea automáticamente createdAt/updatedAt
  versionKey: false                                                              // Oculta __v
});

// -----------------------------------------------------------------------------
// Collation por defecto (ES, insensible a mayúsculas/acentos)
// -----------------------------------------------------------------------------
ProyectoSchema.set('collation', { locale: 'es', strength: 2 });                  // Aplica collation a nivel de colección

// -----------------------------------------------------------------------------
// Índices (definidos UNA sola vez)
// -----------------------------------------------------------------------------
// Índice único compuesto: evita títulos duplicados dentro del mismo owner.       // Descripción del índice
// Además, Mongo puede usar el prefijo de índice {owner, title} para consultas    // Nota: sirve para consultas por owner
// sólo por owner (prefijo), así que NO necesitamos un índice separado en owner.  // Evita índice redundante
ProyectoSchema.index(
  { owner: 1, title: 1 },                                                        // Campos del índice
  { unique: true }                                                               // Único (collation lo aporta el esquema)
);

// Índice simple por estado (sólo definido aquí, no en el campo)                  // Evita duplicidad del índice status
ProyectoSchema.index({ status: 1 });                                             // Acelera filtros por estado

// -----------------------------------------------------------------------------
// Validadores de integridad referencial (FK “suaves” en Mongo)
// -----------------------------------------------------------------------------
// Valida que el owner exista en la colección de usuarios                         // Garantiza owner válido
ProyectoSchema.path('owner').validate(async function (ownerId) {                 // Validador en campo owner
  if (!ownerId) return false;                                                    // Debe existir
  const exists = await mongoose.model('User')                                    // Consulta en User
    .exists({ _id: ownerId });                                                   // Verifica existencia
  return !!exists;                                                               // true si existe
}, 'El usuario "owner" indicado no existe.');                                    // Mensaje de error

// Valida que todos los miembros del team existan como usuarios válidos           // Garantiza members válidos
ProyectoSchema.path('team').validate(async function (arr) {                      // Validador en campo team
  if (!Array.isArray(arr) || arr.length === 0) return true;                      // Arreglo vacío es válido
  const count = await mongoose.model('User')                                     // Cuenta usuarios existentes
    .countDocuments({ _id: { $in: arr } });                                      // Por los _id del team
  return count === arr.length;                                                   // Debe coincidir en cantidad
}, 'Existen miembros de equipo que no corresponden a usuarios válidos.');        // Mensaje de error

// -----------------------------------------------------------------------------
// Exportación del modelo
// -----------------------------------------------------------------------------
module.exports = model('Proyectos', ProyectoSchema);                              // Exporta el modelo
