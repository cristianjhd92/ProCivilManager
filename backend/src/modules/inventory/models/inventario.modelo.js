// File: BackEnd/src/modules/inventory/models/inventario.modelo.js
// Description: Modelo Mongoose para registrar los movimientos de inventario
//              (entradas, salidas y ajustes) de materiales en los distintos
//              almacenes de ProCivil Manager (PCM). Permite llevar un historial
//              de trazabilidad por material, almacén, proyecto, fecha y usuario.

const mongoose = require('mongoose');                        // Importa Mongoose para definir esquemas y modelos de MongoDB

// 📦 Definición del esquema de Movimiento de Inventario
const MovimientoInventarioSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------
    // Tipo de movimiento:
    //  - 'entrada': incremento de stock (compra, devolución, ajuste positivo, etc.).
    //  - 'salida' : decremento de stock (consumo en obra, pérdida, etc.).
    //  - 'ajuste' : ajuste directo al stock (conteo físico, correcciones, etc.).
    // ------------------------------------------------------------
    tipo: {                                                  // Campo que almacena el tipo de movimiento
      type: String,                                          // Tipo de dato: cadena de texto
      enum: ['entrada', 'salida', 'ajuste'],                 // Valores permitidos (incluye 'ajuste' usado en controladores)
      required: true,                                        // Obligatorio para todos los registros
      trim: true,                                            // Normaliza el valor recibido
    },

    // ------------------------------------------------------------
    // Referencia al material afectado por el movimiento de inventario.
    // ------------------------------------------------------------
    material: {                                              // Campo que apunta al material afectado
      type: mongoose.Schema.Types.ObjectId,                  // Identificador de documento en MongoDB
      ref: 'Material',                                       // Nombre del modelo referenciado (models/material.modelo.js)
      required: true,                                        // Sin material no tiene sentido el movimiento
    },

    // ------------------------------------------------------------
    // Almacén donde se registra el movimiento (bodega principal,
    // bodega satélite, etc.). Es opcional.
    // ------------------------------------------------------------
    almacen: {                                               // Campo que apunta al almacén donde ocurre el movimiento
      type: mongoose.Schema.Types.ObjectId,                  // Identificador de documento para almacenes
      ref: 'Almacen',                                        // Nombre del modelo de almacenes (models/almacen.modelo.js)
      default: null,                                         // Permite dejarlo vacío cuando no aplica
    },

    // ------------------------------------------------------------
    // Cantidad de unidades movidas.
    // Debe ser siempre no negativa; la lógica de sumar/restar al stock
    // depende del valor de "tipo" en los controladores.
    // ------------------------------------------------------------
    cantidad: {                                              // Campo para la cantidad movida
      type: Number,                                          // Tipo numérico
      required: true,                                        // Obligatorio para todos los movimientos
      min: [0, 'La cantidad no puede ser negativa'],         // No se permiten cantidades negativas
    },

    // ------------------------------------------------------------
    // Fecha efectiva del movimiento.
    // Por defecto, la fecha y hora actuales en el momento de crear el doc.
    // ------------------------------------------------------------
    fecha: {                                                 // Fecha en la que ocurre el movimiento
      type: Date,                                            // Tipo Date
      default: Date.now,                                     // Por defecto, la fecha de creación del documento
    },

    // ------------------------------------------------------------
    // Campo de texto libre para observaciones adicionales:
    // número de documento, notas internas, referencias de soporte, etc.
    // ------------------------------------------------------------
    observaciones: {                                         // Comentarios u observaciones adicionales
      type: String,                                          // Tipo texto
      trim: true,                                            // Limpia espacios en los bordes
      // Opcional: se usa solo cuando el usuario agrega detalle
    },

    // ------------------------------------------------------------
    // Descripción corta del movimiento (generalmente enviada por
    // el frontend como "descripcion"). Es el texto que suele ver
    // el usuario en la interfaz.
    // ------------------------------------------------------------
    descripcion: {                                           // Descripción amigable del movimiento
      type: String,                                          // Tipo texto
      trim: true,                                            // Normaliza el texto
      // Opcional: depende del flujo que lo envíe
    },

    // ------------------------------------------------------------
    // Usuario que ejecuta el movimiento.
    // Actualmente se almacena como texto (nombre, correo o username).
    // Si en el futuro se requiere, se puede migrar a ref: 'User'.
    // ------------------------------------------------------------
    usuario: {                                               // Identificador textual del usuario que generó el movimiento
      type: String,                                          // Tipo texto
      trim: true,                                            // Elimina espacios sobrantes
      // No se marca como required para permitir registros automáticos
    },

    // ------------------------------------------------------------
    // Proyecto asociado al movimiento de inventario.
    // Se usa cuando la entrada/salida está relacionada con la
    // asignación o devolución de materiales de un proyecto.
    // ------------------------------------------------------------
    proyecto: {                                              // Referencia opcional al proyecto
      type: mongoose.Schema.Types.ObjectId,                  // Identificador de documento para proyectos
      ref: 'Proyectos',                                      // Nombre del modelo de proyectos (models/proyecto.modelo.js)
      default: null,                                         // Solo se llena cuando el movimiento está ligado a un proyecto
    },

    // ------------------------------------------------------------
    // Motivo estructurado del movimiento (por ejemplo:
    // "Asignación a proyecto X", "Devolución por actualización", etc.).
    // Es el campo que suelen usar los controladores de proyectos/inventario.
    // ------------------------------------------------------------
    motivo: {                                                // Motivo del movimiento
      type: String,                                          // Tipo texto
      trim: true,                                            // Normaliza el valor almacenado
      // Muy usado en los controladores para registrar la causa del movimiento
    },

    // ------------------------------------------------------------
    // Stock anterior del material antes de aplicar el movimiento.
    // Permite reconstruir el historial y auditar cambios de inventario.
    // ------------------------------------------------------------
    stockAnterior: {                                         // Cantidad de stock antes del movimiento
      type: Number,                                          // Tipo numérico
      // Opcional: se llena solo cuando el controlador envía este dato
    },

    // ------------------------------------------------------------
    // Stock nuevo del material después de aplicar el movimiento.
    // Junto con "stockAnterior" permite ver el antes/después del cambio.
    // ------------------------------------------------------------
    stockNuevo: {                                            // Cantidad de stock después del movimiento
      type: Number,                                          // Tipo numérico
      // Opcional: se llena solo cuando el controlador envía este dato
    },
  },
  {
    timestamps: true,                                        // Agrega automáticamente createdAt y updatedAt
    collection: 'movimientos_inventario',                    // Nombre explícito de la colección en MongoDB
  }
);

// Exporta el modelo listo para ser utilizado en controladores y servicios.
module.exports = mongoose.model('MovimientoInventario', MovimientoInventarioSchema);
