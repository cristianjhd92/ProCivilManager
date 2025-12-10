// File: BackEnd/src/modules/warehouses/models/almacen.modelo.js
// Description: Modelo Mongoose para los almacenes de ProCivil Manager (PCM).
//              Representa las bodegas o puntos físicos donde se gestionan
//              materiales, inventario y movimientos asociados a proyectos.
//              Incluye ciudad (para filtrar por ubicación del proyecto),
//              estado activo/inactivo y eliminación lógica.

// ==============================
// Importación de dependencias
// ==============================
const mongoose = require('mongoose'); // Importa Mongoose para definir el esquema y el modelo

// ==============================
// Definición del esquema Almacén
// ==============================
const AlmacenSchema = new mongoose.Schema(
  {
    // Nombre del almacén (obligatorio)
    nombre: {
      type: String,   // Nombre comercial del almacén
      required: true, // Campo requerido
      trim: true,     // Elimina espacios en blanco al inicio y al final
    },

    // Ciudad donde se encuentra el almacén.
    // Este campo es clave para poder filtrar los almacenes que apliquen
    // a un proyecto según la ciudad del proyecto (regla de negocio PCM).
    ciudad: {
      type: String,   // Nombre de la ciudad (ej. "Bogotá", "Medellín")
      required: true, // Obligatorio para poder filtrar correctamente
      trim: true,     // Normaliza el texto
    },

    // Departamento o región (opcional, útil para reportes y filtros futuros)
    departamento: {
      type: String,   // Ej. "Cundinamarca", "Antioquia"
      trim: true,     // Elimina espacios sobrantes
    },

    // País donde opera el almacén.
    // Por defecto se asume Colombia, ya que PCM está pensado inicialmente
    // para la realidad colombiana.
    pais: {
      type: String,   // Nombre del país
      trim: true,     // Normaliza el texto
      default: 'Colombia',
    },

    // Dirección física del almacén (opcional)
    direccion: {
      type: String, // Dirección en texto libre (calle, número, etc.)
      trim: true,   // Quita espacios sobrantes
    },

    // Teléfono de contacto del almacén (opcional)
    telefono: {
      type: String, // Se almacena como texto para permitir diferentes formatos
      trim: true,   // Elimina espacios en blanco
    },

    // Correo de contacto del almacén (opcional)
    correo: {
      type: String, // Email del almacén o responsable
      trim: true,   // Normaliza el texto
    },

    // Nombre del encargado o responsable del almacén (opcional)
    encargado: {
      type: String, // Nombre de la persona a cargo
      trim: true,   // Normaliza el texto
    },

    // Estado del almacén:
    //  true  → almacén activo y disponible para selección en proyectos.
    //  false → almacén inactivo (no debería aparecer en listados operativos).
    activo: {
      type: Boolean, // Valor booleano
      default: true, // Por defecto, el almacén se crea activo
    },

    // Eliminación lógica:
    //  - false → almacén vigente en el sistema.
    //  - true  → almacén marcado como eliminado (no se usa en flujos nuevos).
    // Los controladores deben filtrar con { isDeleted: { $ne: true } }.
    isDeleted: {
      type: Boolean, // Valor booleano
      default: false,
    },
  },
  {
    // timestamps agrega automáticamente:
    //  - createdAt: fecha de creación del documento.
    //  - updatedAt: fecha de última actualización.
    timestamps: true,
    // Nombre explícito de la colección en MongoDB
    collection: 'almacenes',
  }
);

// ==============================
// Exportación del modelo
// ==============================

// Exporta el modelo "Almacen" para usarlo en controladores y otros módulos.
module.exports = mongoose.model('Almacen', AlmacenSchema);
