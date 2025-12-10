// File: BackEnd/src/modules/budgets/models/presupuesto.modelo.js
// Description: Modelo Mongoose para gestionar el presupuesto de materiales
//              asociado a un proyecto en ProCivil Manager (PCM). Cada
//              proyecto tiene como máximo un registro de presupuesto de
//              materiales, compuesto por un total y una lista de ítems
//              (material, cantidad prevista y costo previsto).

const mongoose = require('mongoose');                         // Importa Mongoose para definir esquemas y modelos

// -----------------------------------------------------------
// Esquema embebido para los ítems de presupuesto por material
// -----------------------------------------------------------
const presupuestoItemSchema = new mongoose.Schema({
  material: {                                                 // Referencia al material presupuestado
    type: mongoose.Schema.Types.ObjectId,                     // Tipo ObjectId (FK a otra colección)
    ref: 'Material',                                          // Nombre del modelo de Material
    required: true,                                           // Obligatorio: no se permite un ítem sin material
  },
  cantidadPrevista: {                                         // Cantidad estimada de ese material
    type: Number,                                             // Tipo numérico
    required: true,                                           // Obligatorio
    min: 0,                                                   // No se permiten cantidades negativas
  },
  costoPrevisto: {                                            // Costo unitario previsto para el material
    type: Number,                                             // Tipo numérico
    required: true,                                           // Obligatorio
    min: 0,                                                   // No se permiten costos negativos
  },
});

// -----------------------------------------------------------
// Esquema principal del presupuesto de materiales por proyecto
// -----------------------------------------------------------
const presupuestoSchema = new mongoose.Schema(
  {
    proyecto: {                                               // Proyecto al que pertenece este presupuesto
      type: mongoose.Schema.Types.ObjectId,                   // Tipo ObjectId (FK a Proyectos)
      ref: 'Proyectos',                                       // Nombre del modelo de proyectos
      unique: true,                                           // Un presupuesto de materiales por proyecto
      required: true,                                         // Siempre debe estar asociado a un proyecto
    },
    totalPresupuesto: {                                       // Monto total del presupuesto de materiales
      type: Number,                                           // Tipo numérico
      required: true,                                         // Obligatorio
      min: 0,                                                 // No se permiten valores negativos
    },
    items: {                                                  // Lista de ítems de materiales
      type: [presupuestoItemSchema],                          // Arreglo de subdocumentos con material + cantidad + costo
      default: [],                                            // Por defecto un arreglo vacío si no se envían ítems
    },
    createdBy: {                                              // Usuario que creó el presupuesto
      type: mongoose.Schema.Types.ObjectId,                   // Tipo ObjectId
      ref: 'User',                                            // Referencia al modelo de usuario
    },
    updatedBy: {                                              // Último usuario que actualizó el presupuesto
      type: mongoose.Schema.Types.ObjectId,                   // Tipo ObjectId
      ref: 'User',                                            // Referencia al modelo de usuario
    },
    // ⚠️ No definimos updatedAt/createdAt manualmente porque timestamps:true ya los maneja
  },
  {
    timestamps: true,                                         // Agrega automáticamente createdAt y updatedAt
    // Opcional: podrías fijar un nombre específico de colección si lo necesitas:
    // collection: 'presupuestos_materiales',
  }
);

// Exporta el modelo con el nombre "PresupuestoMaterial"
module.exports = mongoose.model('PresupuestoMaterial', presupuestoSchema);
