// File: BackEnd/src/modules/inventory/models/material.modelo.js
// Description: Modelo Mongoose para los materiales de inventario de ProCivil Manager (PCM).
//              Incluye información básica del material (nombre, categoría, unidad, precio),
//              datos de stock (cantidad disponible, stock mínimo), referencia al almacén
//              donde se encuentra y un flag de eliminación lógica (isDeleted).

// Importa Mongoose para definir el esquema y el modelo.
const mongoose = require('mongoose');                                          // Carga la librería Mongoose

// Define la estructura (schema) que tendrán los documentos de la colección "materiales".
const MaterialSchema = new mongoose.Schema(
  {
    // Nombre del material (por ejemplo: "Cemento tipo UG", "Acero de refuerzo #4", etc.).
    nombre: {
      type: String,                                                            // Tipo de dato: cadena de texto
      required: true,                                                          // Es obligatorio
      trim: true,                                                              // Elimina espacios en blanco al inicio y final
    },

    // Categoría del material (ej.: "Concreto", "Acero", "Agregados", "Acabados", etc.).
    categoria: {
      type: String,                                                            // Tipo de dato: cadena de texto
      trim: true,                                                              // Limpia espacios sobrantes
    },

    // Unidad de medida (ej.: "m³", "kg", "und", "m", etc.).
    unidad: {
      type: String,                                                            // Tipo de dato: cadena de texto
      trim: true,                                                              // Limpia espacios sobrantes
    },

    // Precio unitario del material en COP.
    precioUnitario: {
      type: Number,                                                            // Tipo de dato: numérico
      default: 0,                                                              // Valor por defecto: 0 si no se especifica
      min: 0,                                                                  // No permite valores negativos
    },

    // Cantidad disponible del material en inventario.
    cantidad: {
      type: Number,                                                            // Tipo de dato: numérico
      default: 0,                                                              // Por defecto, 0 unidades en stock
      min: 0,                                                                  // No permite cantidades negativas
    },

    // Stock mínimo recomendado para generar alertas de reposición.
    stockMinimo: {
      type: Number,                                                            // Tipo de dato: numérico
      default: 3,                                                              // Valor por defecto: 3 unidades
      min: 0,                                                                  // No permite valores negativos
    },

    // Referencia al almacén donde se encuentra el material.
    // Permite relacionar este material con un documento de la colección "almacenes".
    almacen: {
      type: mongoose.Schema.Types.ObjectId,                                    // Tipo ObjectId (referencia)
      ref: 'Almacen',                                                          // Nombre del modelo referenciado
    },

    // Campo para eliminación lógica (soft delete).
    // Cuando isDeleted = true:
    //   - El material NO debería aparecer en listados normales.
    //   - No debería permitirse su uso en nuevos movimientos/solicitudes.
    // La responsabilidad de filtrar isDeleted = false está en los controladores/servicios.
    isDeleted: {
      type: Boolean,                                                           // Tipo de dato: booleano
      default: false,                                                          // Por defecto, el material está activo
    },
  },
  {
    // Opciones adicionales del schema.
    timestamps: true,                                                          // Añade createdAt y updatedAt automáticamente
    collection: 'materiales',                                                  // Fuerza el nombre de la colección en MongoDB
  }
);

// Crea y exporta el modelo "Material" basado en el schema definido.
// Esto permite usar Material.find(), Material.create(), etc. en el resto del backend.
module.exports = mongoose.model('Material', MaterialSchema);                   // Exporta el modelo en formato CommonJS
