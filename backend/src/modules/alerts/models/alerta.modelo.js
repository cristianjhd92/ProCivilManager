// File: BackEnd/src/modules/alerts/models/alerta.modelo.js
// Description: Modelo Mongoose para gestionar las alertas del sistema
//              en ProCivil Manager (PCM). Permite registrar alertas
//              relacionadas con presupuesto, stock, asignaciones de
//              líder de obra, solicitudes y eventos de proyectos, y
//              controlar si han sido vistas y/o atendidas.

/* ==============================
 * Importación de dependencias
 * ============================== */

// Importa la librería Mongoose, que se usa para definir esquemas y modelos
// asociados a colecciones de MongoDB.
const mongoose = require('mongoose');

/* ==========================================
 * Definición del esquema de la colección
 * ========================================== */

// Crea una nueva instancia de Schema para la colección "alertas".
const alertaSchema = new mongoose.Schema(
  {
    // ---------------------------------------
    // Referencias relacionales (opcionales)
    // ---------------------------------------

    // Referencia al proyecto asociado a la alerta.
    // Se usa, por ejemplo, para:
    //  - Alertas de presupuesto (cuando se alcanza un umbral).
    //  - Alertas de asignación / remoción de líder de obra.
    //  - Alertas vinculadas a solicitudes sobre un proyecto específico.
    //  - Notificaciones al cliente cuando se crea su proyecto o cambia de estado.
    proyecto: {
      // Almacena un ObjectId de Mongo que apunta al documento del proyecto.
      type: mongoose.Schema.Types.ObjectId,
      // Indica a Mongoose que este campo se relaciona con el modelo "Proyectos".
      ref: 'Proyectos',
      // Si no se pasa un proyecto concreto, se deja en null.
      default: null,
    },

    // Referencia al material asociado a la alerta (opcional).
    // Se usa principalmente en alertas de inventario, por ejemplo:
    //  - "El material X quedó por debajo del stock mínimo."
    //  - "El material Y está agotado."
    material: {
      // ObjectId del material en la colección de materiales.
      type: mongoose.Schema.Types.ObjectId,
      // Relación con el modelo "Material".
      ref: 'Material',
      // Null si la alerta no está asociada a un material concreto.
      default: null,
    },

    /**
     * Usuario destinatario de la alerta (opcional).
     *
     * Casos de uso típicos:
     *  - Para alertas de tipo "asignacion":
     *      Apunta al líder de obra al que se le asigna o remueve un proyecto.
     *
     *  - Para alertas dirigidas a clientes:
     *      Apunta al usuario de rol "cliente" que debe ver la alerta
     *      (por ejemplo cuando se crea su proyecto o cambia el estado).
     *
     *  - Para alertas "globales" del sistema (panel administrador):
     *      Puede quedar en null y el frontend decide mostrarla sólo a
     *      administradores.
     */
    usuario: {
      // ObjectId del usuario destinatario de la alerta.
      type: mongoose.Schema.Types.ObjectId,
      // Relación con el modelo de usuarios "User".
      ref: 'User',
      // Si no hay un usuario específico, se deja en null.
      default: null,
    },

    /**
     * Referencia opcional a una solicitud (de proyecto o de material).
     *
     * Permite enlazar alertas como:
     *  - "Tu solicitud #123 fue aprobada."
     *  - "Tienes una nueva respuesta en la solicitud #456."
     *
     * Así el frontend puede navegar desde la alerta directamente
     * al detalle de la solicitud asociada.
     */
    solicitud: {
      // ObjectId de la solicitud a la que está vinculada la alerta.
      type: mongoose.Schema.Types.ObjectId,
      // Relación con el modelo "Solicitud".
      ref: 'Solicitud',
      // Null si la alerta no está asociada a ninguna solicitud.
      default: null,
    },

    // ---------------------------------------
    // Datos principales de la alerta
    // ---------------------------------------

    /**
     * Tipo de alerta.
     *
     * Valores permitidos:
     *  - 'presupuesto':
     *      Cuando el costo de materiales de un proyecto alcanza un
     *      umbral del presupuesto (ej. 80 %, 90 %, 100 %).
     *
     *  - 'stock':
     *      Cuando el stock de un material baja del mínimo configurado
     *      o se agota.
     *
     *  - 'asignacion':
     *      Cuando se asigna o se remueve un líder de obra de un proyecto
     *      (típica para notificar al líder).
     *
     *  - 'solicitud':
     *      Para notificar sobre:
     *        * Nuevas solicitudes de proyecto o material.
     *        * Cambios de estado en dichas solicitudes.
     *
     *  - 'proyecto':
     *      Para notificar sobre:
     *        * Creación de un proyecto para un cliente.
     *        * Cambios de estado importantes del proyecto.
     *        * Hitos relevantes de avance.
     */
    tipo: {
      // El tipo se almacena como cadena de texto.
      type: String,
      // Lista cerrada de tipos de alerta permitidos.
      enum: ['presupuesto', 'stock', 'asignacion', 'solicitud', 'proyecto'],
      // Campo obligatorio: toda alerta debe tener un tipo.
      required: true,
    },

    // Mensaje descriptivo de la alerta que verá el usuario.
    // Ejemplos:
    //  - "El presupuesto ha superado el 80 % de ejecución."
    //  - "Se ha creado el proyecto Torres de San Isidro asociado a tu cuenta."
    message: {
      // Texto del mensaje.
      type: String,
      // No se permiten alertas sin mensaje.
      required: true,
      // Elimina espacios sobrantes al inicio y al final del texto.
      trim: true,
    },

    /**
     * Nivel de severidad de la alerta.
     *
     * Permite diferenciar visualmente y en lógica:
     *  - 'info':       Notificación general (creación de proyecto, comentario nuevo, etc.).
     *  - 'advertencia':Situaciones importantes a revisar (80 % presupuesto, stock bajo, etc.).
     *  - 'critica':    Casos críticos (presupuesto excedido, stock agotado, etc.).
     */
    nivel: {
      type: String,
      enum: ['info', 'advertencia', 'critica'],
      default: 'info',
    },

    // Umbral numérico que disparó la alerta (opcional).
    // Ejemplos de uso:
    //  - Porcentaje de presupuesto ejecutado (80, 90, 100).
    //  - Cantidad mínima de stock que se alcanzó.
    threshold: {
      // Valor numérico asociado al disparador de la alerta.
      type: Number,
      // Null si la alerta no depende de un umbral numérico.
      default: null,
    },

    /**
     * Indica si la alerta ya fue vista en la bandeja por el usuario.
     *
     * Esto es independiente de si está resuelta o no:
     *  - visto = true, resolved = false  → El usuario la vio pero aún no la ha gestionado.
     *  - visto = true, resolved = true   → El usuario ya la vio y el caso está atendido.
     */
    visto: {
      type: Boolean,
      default: false,
    },

    // Fecha en la que el usuario abre/vio la alerta por primera vez.
    fechaVisto: {
      type: Date,
      default: null,
    },

    // Indica si la alerta ya fue atendida / resuelta por el usuario
    // o por el administrador.
    // Sirve para filtrar alertas pendientes en el panel.
    resolved: {
      // true  => la alerta está resuelta / gestionada.
      // false => la alerta sigue pendiente de atención.
      type: Boolean,
      // Por defecto, toda alerta nueva se crea como NO resuelta.
      default: false,
    },
  },
  {
    // Activa campos automáticos de auditoría:
    //  - createdAt: fecha y hora de creación del documento.
    //  - updatedAt: fecha y hora de la última actualización.
    timestamps: true,
  }
);

/* ===========================
 * Índices recomendados
 * =========================== */

// Índice para listar rápido las alertas de un usuario por estado y fecha.
alertaSchema.index({ usuario: 1, resolved: 1, createdAt: -1 });

// Índice para consultas por proyecto (panel de detalle de proyecto).
alertaSchema.index({ proyecto: 1, tipo: 1, createdAt: -1 });

/* ===========================
 * Exportación del modelo
 * =========================== */

// Crea y exporta el modelo "Alerta" basado en el esquema anterior.
// Mongoose usará la colección "alertas" (en minúscula y plural).
module.exports = mongoose.model('Alerta', alertaSchema);
