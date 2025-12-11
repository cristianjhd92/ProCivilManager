// File: BackEnd/src/modules/requests/models/solicitud.modelo.js
// Description: Modelo Mongoose para almacenar solicitudes de proyectos y de
//              materiales adicionales en ProCivil Manager (PCM). Permite
//              registrar quién solicita, de qué tipo es la solicitud,
//              materiales asociados (si aplica), el historial de respuestas
//              y el estado del trámite.

const mongoose = require('mongoose'); // Importa Mongoose para definir esquemas y modelos de MongoDB

/**
 * Esquema de Solicitudes
 *
 * Una solicitud representa una petición realizada por un usuario para:
 *  - iniciar un nuevo proyecto, o
 *  - solicitar materiales adicionales para un proyecto existente.
 *
 * Las solicitudes son gestionadas por administradores (y eventualmente líderes),
 * quienes pueden aprobar, rechazar o marcar como procesadas las peticiones.
 */
const solicitudSchema = new mongoose.Schema(
  {
    // ==========================================
    // Datos base de la solicitud
    // ==========================================

    // Usuario que realiza la solicitud (cliente o líder de obra).
    solicitante: {
      type: mongoose.Schema.Types.ObjectId, // ObjectId que enlaza con la colección de usuarios.
      ref: 'User',                          // Modelo de referencia: User.
      required: true,                       // Siempre debe existir un usuario solicitante.
    },

    // Tipo de solicitud:
    //  - 'proyecto' → para proponer/solicitar un nuevo proyecto.
    //  - 'material' → para pedir materiales adicionales de un proyecto ya existente.
    tipo: {
      type: String,                         // Tipo de dato: cadena de texto.
      enum: ['proyecto', 'material'],       // Solo se permiten estos dos valores.
      required: true,                       // Es obligatorio indicar el tipo.
    },

    // Título descriptivo de la solicitud (nombre del proyecto o asunto de materiales).
    titulo: {
      type: String,                         // Título corto de la solicitud.
      trim: true,                           // Elimina espacios al inicio y al final.
      required: true,                       // Se exige un título legible para todas las solicitudes.
    },

    // Descripción detallada de la solicitud.
    descripcion: {
      type: String,                         // Detalle amplio de lo que se está solicitando.
      trim: true,                           // Limpia espacios al inicio/fin.
      // No se marca como required para permitir solicitudes breves, pero
      // en el frontend se puede validar que tenga contenido útil.
    },

    /**
     * Proyecto relacionado con la solicitud (opcional).
     *
     * - Para solicitudes de tipo "material", permite saber a qué proyecto
     *   se le están pidiendo materiales adicionales.
     * - Para solicitudes de tipo "proyecto", se puede rellenar cuando la
     *   solicitud ya fue materializada en un proyecto real y se quiere
     *   dejar el vínculo histórico.
     */
    proyecto: {
      type: mongoose.Schema.Types.ObjectId, // ObjectId de MongoDB.
      ref: 'Proyectos',                     // Modelo de referencia: Proyectos.
      // No se marca como required: hay solicitudes sin proyecto (todavía).
    },

    /**
     * Lista de materiales solicitados (solo aplica cuando tipo = 'material').
     *
     * Cada elemento contiene:
     *  - material: referencia al ítem de la bodega.
     *  - cantidad: unidades requeridas.
     *
     * Para solicitudes de proyectos, este campo puede permanecer vacío.
     */
    materiales: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId, // Material que se está solicitando.
          ref: 'Material',                      // Modelo de referencia: Material.
          required: true,                       // Obligatorio para cada entrada de material.
        },
        cantidad: {
          type: Number,                         // Cantidad requerida de ese material.
          required: true,                       // Obligatorio.
          min: [1, 'La cantidad debe ser al menos 1'], // Validación: mínimo 1 unidad.
        },
      },
    ],

    /**
     * Historial de respuestas asociadas a la solicitud.
     *
     * Permite registrar la comunicación entre el solicitante (cliente o líder)
     * y los administradores / líderes que gestionan la solicitud.
     * Cada entrada representa un mensaje dentro del "hilo" de la solicitud.
     */
    respuestas: [
      {
        autor: {
          type: mongoose.Schema.Types.ObjectId, // Usuario que envía la respuesta.
          ref: 'User',                          // Modelo de referencia: User.
          required: true,                       // Siempre debe existir un autor.
        },
        mensaje: {
          type: String,                         // Contenido textual de la respuesta.
          trim: true,                           // Limpia espacios en los extremos.
          required: true,                       // No se permiten respuestas vacías.
        },
        fecha: {
          type: Date,                           // Momento en que se registró la respuesta.
          default: Date.now,                    // Por defecto, la fecha actual.
        },
      },
    ],

    // Estado de la solicitud:
    //  - 'pendiente'  → recién creada, sin decisión.
    //  - 'aprobada'   → aceptada (puede derivar en creación de proyecto o entrega de materiales).
    //  - 'rechazada'  → denegada por el administrador.
    //  - 'procesada'  → tramitada/completada (por ejemplo, materiales entregados).
    estado: {
      type: String,                             // Tipo texto.
      enum: ['pendiente', 'aprobada', 'rechazada', 'procesada'], // Estados permitidos.
      default: 'pendiente',                     // Valor por defecto al crear una nueva solicitud.
    },

    // Fecha de creación lógica de la solicitud (propia del modelo).
    fechaSolicitud: {
      type: Date,                               // Momento en que se generó la solicitud.
      default: Date.now,                        // Por defecto, la fecha actual.
    },

    // Fecha de la última actualización de la solicitud
    // (por ejemplo, cuando se cambia el estado o se agrega una respuesta).
    fechaActualizacion: {
      type: Date,                               // Última vez que se cambió algo importante.
      default: Date.now,                        // Por defecto, la fecha actual.
    },
  },
  {
    timestamps: true,                           // Agrega createdAt y updatedAt automáticamente (además de las fechas propias).
    collection: 'solicitudes',                  // Nombre explícito de la colección en MongoDB.
  }
);

/**
 * Hook de guardado:
 * Actualiza siempre `fechaActualizacion` antes de guardar el documento.
 * Esto asegura que cada cambio relevante quede trazado.
 */
solicitudSchema.pre('save', function (next) {
  this.fechaActualizacion = new Date(); // Actualiza la marca de tiempo lógica.
  next();                               // Continúa con el guardado normal.
});

/**
 * Índice recomendado para acelerar consultas frecuentes por:
 *  - solicitante (quién creó la solicitud),
 *  - tipo (proyecto / material),
 *  - estado (pendiente / aprobada / etc.),
 *  - createdAt (orden cronológico).
 *
 * Esto ayuda mucho en listados tipo:
 *  - "Mis solicitudes de proyecto pendientes".
 *  - "Solicitudes de material pendientes para revisión del admin".
 */
solicitudSchema.index({
  solicitante: 1,
  tipo: 1,
  estado: 1,
  createdAt: -1,
});

// Exporta el modelo "Solicitud" listo para usar en controladores y servicios.
module.exports = mongoose.model('Solicitud', solicitudSchema);
