// File: BackEnd/src/modules/reports/models/reporte.modelo.js
// Description: Modelo Mongoose para registrar los reportes generados en
//              ProCivil Manager (PCM). Permite llevar un historial de qué
//              usuario generó qué tipo de reporte, con qué filtros y, si
//              aplica, dónde quedó almacenado el archivo (ruta local o S3).

const mongoose = require('mongoose');                            // Importa Mongoose para definir esquemas y modelos

// Extrae el constructor de Schema para definir la estructura del documento
const { Schema } = mongoose;                                     // Atajo para mongoose.Schema

// Definición del esquema de Reporte
const ReporteSchema = new Schema(
  {
    // Usuario que generó el reporte.
    // Referencia al modelo de usuario del sistema (User).
    usuario: {
      type: Schema.Types.ObjectId,                               // ObjectId que referencia a la colección de usuarios
      ref: 'User',                                               // Nombre del modelo de usuario (usuario.modelo.js)
      required: true,                                            // Siempre debe existir un usuario asociado
    },

    // Tipo de reporte generado.
    // Ejemplos:
    //  - "estadisticas_proyectos_global"
    //  - "estadisticas_proyectos_por_cliente"
    //  - "presupuesto_proyecto"
    tipoReporte: {
      type: String,                                              // Texto que identifica el tipo de reporte
      required: true,                                            // Obligatorio
      trim: true,                                                // Elimina espacios al inicio y al final
    },

    // Formato del reporte.
    // Por ahora casi siempre será "pdf", pero se deja preparado por si en
    // el futuro exportas también "xlsx", "csv", etc.
    formato: {
      type: String,                                              // Texto con el formato (pdf, xlsx, csv...)
      default: 'pdf',                                            // Valor por defecto: PDF
      trim: true,
    },

    // Filtros o parámetros usados para generar el reporte.
    // Se deja como tipo flexible (Mixed) para poder guardar cualquier
    // estructura JSON (rango de fechas, estados, ids, etc.).
    filtros: {
      type: Schema.Types.Mixed,                                  // Permite cualquier estructura JSON
      default: {},                                               // Por defecto un objeto vacío
    },

    // Ruta o identificador del archivo generado (opcional).
    // - Si guardas el PDF en disco local → ruta absoluta/relativa.
    // - Si lo subes a S3 → key del objeto.
    // - Si no se almacena → puede quedarse null.
    ubicacionArchivo: {
      type: String,                                              // Texto con ruta o key
      default: null,                                             // Null si no se guarda físicamente
      trim: true,
    },

    // Tamaño aproximado del archivo en bytes (opcional).
    tamanoBytes: {
      type: Number,                                              // Número de bytes del archivo
      default: null,                                             // Null si no se calcula
      min: 0,                                                    // No se permiten valores negativos
    },

    // Estado del reporte (opcional).
    // Puede ser útil si en algún momento generas reportes en background.
    // Valores sugeridos:
    //  - "generado"
    //  - "fallido"
    //  - "en_proceso"
    estado: {
      type: String,                                              // Estado del reporte
      default: 'generado',                                       // Por defecto se marca como generado
      trim: true,
    },
  },
  {
    timestamps: true,                                            // Añade createdAt y updatedAt automáticamente
    collection: 'reportes',                                      // Nombre explícito de la colección en MongoDB
  }
);

// Exporta el modelo "Reporte" basado en el esquema definido.
// Permite usar Reporte.find(), Reporte.create(), etc. en controladores/servicios.
module.exports = mongoose.model('Reporte', ReporteSchema);       // Compila y exporta el modelo Reporte
