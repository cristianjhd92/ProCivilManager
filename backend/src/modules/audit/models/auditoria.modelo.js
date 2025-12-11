// File: BackEnd/src/modules/audit/models/auditoria.modelo.js
// Description: Modelo de Mongoose para los registros de auditoría del sistema.
//              Permite almacenar quién realizó una acción (user), qué acción fue,
//              sobre qué recurso se ejecutó y detalles adicionales en un objeto flexible.

const mongoose = require('mongoose');                                // Importa Mongoose para definir el esquema y el modelo

const { Schema } = mongoose;                                         // Extrae solo Schema desde mongoose

// Definición del esquema de auditoría
const auditLogSchema = new Schema(
  {
    // Usuario que realizó la acción.
    // Es una referencia al modelo "User" para poder hacer populate y mostrar nombre, correo, rol, etc.
    user: {                                                          // Campo "user" del log
      type: Schema.Types.ObjectId,                                   // Usa ObjectId para referenciar a un documento de otra colección
      ref: 'User',                                                   // Referencia al modelo "User"
      required: false,                                               // Opcional: permite logs del sistema sin usuario (ej. tareas automáticas)
    },

    // Acción realizada. Ejemplos:
    // - "CREAR_PROYECTO"
    // - "ACTUALIZAR_USUARIO"
    // - "ELIMINAR_MATERIAL"
    action: {                                                        // Campo "action" del log
      type: String,                                                  // Tipo cadena de texto
      required: true,                                                // Obligatorio: siempre debe existir
      trim: true,                                                    // Quita espacios al inicio y al final
    },

    // Recurso sobre el que se ejecutó la acción. Ejemplos:
    // - "Proyecto"
    // - "Usuario"
    // - "Material"
    // - "Almacen"
    resource: {                                                      // Campo "resource" del log
      type: String,                                                  // Tipo cadena de texto
      required: false,                                               // Opcional
      trim: true,                                                    // Quita espacios al inicio y al final
    },

    // Detalles adicionales de la acción (payload flexible).
    // Ejemplos:
    // - { projectId: '...', previousStatus: 'draft', newStatus: 'approved' }
    // - { userId: '...', changes: { email: 'nuevo@correo.com' } }
    details: {                                                       // Campo "details" con información extra
      type: Schema.Types.Mixed,                                      // Permite cualquier estructura JSON
      default: {},                                                   // Por defecto un objeto vacío
    },
  },
  {
    // timestamps añade:
    //  - createdAt: fecha/hora de creación del registro
    //  - updatedAt: fecha/hora de última actualización
    timestamps: true,                                                // Activa campos createdAt y updatedAt automáticos
    collection: 'logs_auditoria',                                    // Nombre explícito de la colección en MongoDB (opcional pero recomendable)
  }
);

// Índices recomendados para consultar rápido el historial
auditLogSchema.index({ createdAt: -1 });                             // Consultas por fecha (más recientes primero)
auditLogSchema.index({ action: 1, createdAt: -1 });                  // Historial por tipo de acción
auditLogSchema.index({ resource: 1, createdAt: -1 });                // Historial por recurso

// Exportamos el modelo "AuditLog" basado en el esquema definido.
module.exports = mongoose.model('AuditLog', auditLogSchema);         // Compila el modelo AuditLog y lo exporta
