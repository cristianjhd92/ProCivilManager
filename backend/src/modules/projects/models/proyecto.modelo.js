// File: BackEnd/src/modules/projects/models/proyecto.modelo.js          // Ruta del archivo dentro del backend de PCM.
// Description: Esquema Mongoose para los proyectos de ProCivil Manager  // Descripción: define la estructura de los documentos
//              (PCM). Contiene datos generales (título, país, ciudad,   // de proyectos en MongoDB, incluyendo datos generales,
//              tipo, presupuesto, fechas y duración calculada),         // relaciones con líder y cliente, equipo de trabajo,
//              comentarios, adjuntos, líder de obra, cliente, equipo,   // comentarios, adjuntos, materiales, criterios de avance
//              estado, progreso, criterios de avance y materiales       // y métodos de instancia para cálculo de costos y verificación
//              asignados. Incluye métodos de instancia para calcular    // de disponibilidad de materiales. Se añaden campos nuevos
//              el costo total de materiales y verificar la disponibilidad// (pais, ciudad, esProyectoPropio, criteriosAvance) y
//              en inventario, así como campos nuevos para país, ciudad, // validaciones para soportar los requisitos funcionales
//              proyecto propio y criterios de avance por tipo/prioridad.// recientes de gestión de proyectos en PCM.

const mongoose = require('mongoose');                                      // Importa Mongoose para definir el esquema y el modelo.

// 🔹 Esquema principal de Proyecto
const ProyectoSchema = new mongoose.Schema(
  {
    // -----------------------------
    // Datos generales del proyecto
    // -----------------------------
    title: {
      type: String,                                                       // Título o nombre del proyecto.
      required: true,                                                     // Obligatorio: todo proyecto debe tener título.
      trim: true                                                          // Limpia espacios en blanco al inicio y al final.
    },
    /**
     * País donde se desarrolla el proyecto.
     * Se define como campo separado para soportar filtros y reportes
     * multinivel (país / ciudad), pero en este momento el sistema está
     * pensado principalmente para Colombia.
     */
    pais: {
      type: String,                                                       // País del proyecto (ej: "Colombia").
      required: true,                                                     // Obligatorio según los requisitos de negocio.
      trim: true                                                          // Limpia espacios sobrantes.
    },
    /**
     * Ciudad donde se desarrolla el proyecto.
     * Este campo es clave para:
     *  - Cargar los almacenes de materiales disponibles en la ciudad.
     *  - Filtrar proyectos por ubicación (listados, dashboards).
     */
    ciudad: {
      type: String,                                                       // Ciudad del proyecto (ej: "Bogotá", "Funza", etc.).
      required: true,                                                     // Obligatorio según los requisitos de negocio.
      trim: true                                                          // Limpia espacios sobrantes.
    },
    location: {
      type: String,                                                       // Ubicación detallada (dirección, barrio, referencia).
      trim: true                                                          // Limpia espacios sobrantes.
    },
    type: {
      type: String,                                                       // Tipo de proyecto (residencial, comercial, etc.).
      required: true,                                                     // Obligatorio para poder definir criterios por tipo.
      trim: true                                                          // Limpia espacios sobrantes.
    },
    /**
     * Presupuesto global del proyecto.
     * Se asume que el presupuesto está expresado en pesos colombianos (COP),
     * de acuerdo con el contexto objetivo de la plataforma.
     */
    budget: {
      type: Number,                                                       // Presupuesto global de referencia (en COP).
      required: true,                                                     // Obligatorio: todo proyecto debe tener un presupuesto.
      min: 0                                                              // No se permiten valores negativos.
    },

    /**
     * Moneda del presupuesto.
     * En este momento la plataforma está pensada solo para Colombia,
     * por lo que se fija en "COP" (pesos colombianos) y no se permite
     * otro valor.
     */
    budgetCurrency: {
      type: String,                                                       // Código de moneda.
      default: 'COP',                                                     // Siempre "COP" por contexto colombiano.
      enum: ['COP']                                                       // Restringe a un solo valor permitido.
    },

    /**
     * Duración estimada en días.
     * Este campo es CALCULADO automáticamente a partir de startDate y endDate
     * en los controladores/servicios. No debería editarse manualmente ni en
     * la creación ni en la edición desde el frontend.
     */
    duration: {
      type: Number,                                                       // Duración del proyecto en días calendario.
      min: 0                                                              // No se permiten duraciones negativas.
    },
    comentario: {
      type: String,                                                       // Comentario general (campo legado para compatibilidad).
      default: ''                                                         // Por defecto, vacío.
    },

    /**
     * Arreglo de comentarios asociados al proyecto.
     * Cada comentario incluye:
     *  - usuario: referencia al usuario que lo realizó (admin o líder).
     *  - contenido: texto del comentario.
     *  - fecha: momento en que fue creado.
     *
     * Se usa para el historial de discusiones y avances, SIN sobrescribir
     * el campo 'comentario' general. Mantener 'comentario' permite no
     * romper datos antiguos mientras se usa 'comentarios' para el flujo nuevo.
     */
    comentarios: [
      {
        usuario: {
          type: mongoose.Schema.Types.ObjectId,                            // Referencia al usuario que hace el comentario.
          ref: 'User',                                                     // Modelo de usuario.
          required: true                                                   // Siempre debe existir un usuario asociado.
        },
        contenido: {
          type: String,                                                    // Texto del comentario.
          required: true                                                   // Obligatorio.
        },
        fecha: {
          type: Date,                                                      // Fecha de creación del comentario.
          default: Date.now                                                // Por defecto, fecha actual.
        }
      }
    ],

    /**
     * Archivos adjuntos asociados al proyecto.
     * Cada adjunto representa un archivo físico almacenado en el servidor
     * junto con metadatos básicos para poder mostrarlo y gestionarlo.
     */
    adjuntos: [
      {
        nombreOriginal: {
          type: String,                                                   // Nombre original del archivo (como lo subió el usuario).
          required: true,                                                 // Obligatorio.
          trim: true                                                      // Elimina espacios en blanco al inicio y final.
        },
        nombreArchivo: {
          type: String,                                                   // Nombre del archivo tal como se guarda en el servidor.
          required: true                                                  // Obligatorio.
        },
        tipoMime: {
          type: String,                                                   // Tipo MIME (image/png, application/pdf, etc.).
          required: true                                                  // Obligatorio.
        },
        size: {
          type: Number,                                                   // Tamaño en bytes.
          required: true                                                  // Obligatorio.
        },
        ruta: {
          type: String,                                                   // Ruta relativa para acceder al archivo (ej: uploads/proyectos/...).
          required: true                                                  // Obligatorio.
        },
        descripcion: {
          type: String,                                                   // Descripción opcional del adjunto.
          default: ''                                                     // Si no se envía, queda en blanco.
        },
        fechaSubida: {
          type: Date,                                                     // Fecha en que se subió el archivo.
          default: Date.now                                               // Por defecto, fecha actual.
        },
        subidoPor: {
          type: mongoose.Schema.Types.ObjectId,                           // Usuario que subió el archivo.
          ref: 'User',                                                    // Referencia al modelo de usuarios.
          required: false                                                 // Opcional por compatibilidad con datos antiguos.
        }
      }
    ],

    /**
     * Referencia al líder de obra asignado al proyecto.
     * Apunta a un documento de la colección de usuarios cuyo rol es
     * 'líder de obra'. Si es null, el proyecto aún no tiene líder.
     */
    lider: {
      type: mongoose.Schema.Types.ObjectId,                               // Id del usuario líder de obra.
      ref: 'User',                                                        // Referencia al modelo de usuarios.
      default: null                                                       // Sin líder asignado por defecto.
    },

    /**
     * Prioridad del proyecto (alta, media, baja, etc.).
     * Este campo se usará junto con "type" para determinar el conjunto de
     * criterios de avance que aplican al proyecto.
     */
    priority: {
      type: String,                                                       // Prioridad del proyecto.
      required: true,                                                     // Obligatorio según requisitos de negocio.
      trim: true                                                          // Limpia espacios sobrantes.
    },

    /**
     * Fechas de inicio y fin del proyecto.
     * A partir de estas fechas se calcula la duración en días.
     */
    startDate: {
      type: Date,                                                         // Fecha de inicio del proyecto.
      required: true                                                      // Obligatoria para poder calcular duración.
    },
    endDate: {
      type: Date,                                                         // Fecha de fin del proyecto.
      required: true                                                      // Obligatoria para poder calcular duración.
    },

    /**
     * Indica si el proyecto está activo. Permite realizar eliminaciones lógicas (soft delete).
     * Cuando se establece en false, el proyecto no se elimina físicamente de la base de datos,
     * pero deja de mostrarse en los listados y consultas regulares.
     */
    activo: {
      type: Boolean,
      default: true,
    },

    /**
     * Correo de contacto del cliente (texto plano, legado).
     * Se mantiene por compatibilidad, pero el flujo nuevo debe usar
     * la referencia al usuario cliente y el indicador de proyecto propio.
     */
    email: {
      type: String,                                                       // Correo de contacto (legacy).
      trim: true                                                          // Limpia espacios sobrantes.
    },

    /**
     * Referencia al usuario cliente asociado al proyecto.
     * Permite enviar notificaciones específicas al cliente cuando el
     * estado del proyecto cambia o cuando se registran hitos relevantes.
     */
    cliente: {
      type: mongoose.Schema.Types.ObjectId,                               // Id del usuario cliente.
      ref: 'User',                                                        // Referencia al modelo de usuarios.
      required: false                                                     // Opcional para no romper proyectos antiguos.
    },

    /**
     * Indicador de si el proyecto es propio (sin cliente asociado).
     * - Si esProyectoPropio === true → cliente debería ser null.
     * - Si esProyectoPropio === false → debería haber un cliente asociado.
     * Esto apoya el flujo de "correo del cliente" con opción "Propio".
     */
    esProyectoPropio: {
      type: Boolean,                                                      // true si es proyecto propio de la empresa.
      default: false                                                      // Por defecto, se asume que es para un cliente.
    },

    /**
     * Equipo del proyecto.
     * Antes existía como un array genérico (ej: ["Maestro", "Residente"]).
     * Ahora se modela como arreglo de objetos con estructura fija para
     * soportar reportes y listados más formales.
     *
     * NOTA: En la base de datos pueden seguir existiendo registros antiguos
     *       con strings. El frontend ya se encarga de normalizar esos casos.
     */
    team: [
      {
        nombre: {
          type: String,                                                   // Nombres del integrante.
          trim: true                                                      // Limpia espacios sobrantes.
        },
        apellido: {
          type: String,                                                   // Apellidos del integrante.
          trim: true                                                      // Limpia espacios sobrantes.
        },
        tipoDocumento: {
          type: String,                                                   // Tipo de documento (CC, CE, NIT, PAS, etc.).
          trim: true                                                      // Limpia espacios sobrantes.
        },
        numeroDocumento: {
          type: String,                                                   // Número de documento.
          trim: true                                                      // Limpia espacios sobrantes.
        },
        cargo: {
          type: String,                                                   // Cargo dentro del proyecto (Residente, Maestro, Ayudante, etc.).
          trim: true                                                      // Limpia espacios sobrantes.
        }
      }
    ],

    /**
     * Estado del proyecto.
     * Ejemplos: "planning", "in-progress", "completed", etc.
     * Según los requisitos, al crear un proyecto debe iniciar en
     * estado "planning".
     */
    status: {
      type: String,                                                       // Estado actual del proyecto.
      required: true,                                                     // Obligatorio.
      trim: true,                                                         // Limpia espacios sobrantes.
      default: 'planning'                                                 // Valor por defecto al crear el proyecto.
    },

    /**
     * Avance porcentual del proyecto (0–100).
     * Este valor se recalcula automáticamente a partir de los criterios
     * de avance (criteriosAvance) que se marquen o desmarquen en la
     * creación/edición del proyecto.
     *
     * El helper calcularProgresoProyecto combina:
     *  - criteriosAvance
     *  - tiempo (startDate / endDate)
     *  - estado (status)
     *  - progreso manual (si se quiere usar como ajuste fino)
     */
    progress: {
      type: Number,                                                       // Avance porcentual del proyecto.
      default: 0,                                                         // Por defecto, 0% al crear el proyecto.
      min: 0,                                                             // No se permiten valores negativos.
      max: 100                                                            // No se permite pasar de 100%.
    },

    /**
     * Criterios de avance del proyecto.
     * Cada criterio representa una condición que, al cumplirse, suma un
     * porcentaje determinado al avance del proyecto.
     *
     * La definición de qué criterios se crean y con qué porcentaje depende
     * del tipo de proyecto y de la prioridad, y se gestionará en los
     * servicios/controladores usando el helper:
     *   generarCriteriosPorTipoYPrioridad(type, priority)
     * del archivo calcularProgresoProyecto.js
     */
    criteriosAvance: [
      {
        codigo: {
          type: String,                                                   // Código interno del criterio (ej: "PLANOS_APROBADOS").
          trim: true                                                      // Limpia espacios sobrantes.
        },
        nombre: {
          type: String,                                                   // Nombre legible del criterio.
          trim: true                                                      // Limpia espacios sobrantes.
        },
        descripcion: {
          type: String,                                                   // Descripción detallada del criterio.
          trim: true                                                      // Limpia espacios sobrantes.
        },
        porcentaje: {
          type: Number,                                                   // Porcentaje del avance que aporta este criterio.
          min: 0,                                                         // No se permiten valores negativos.
          max: 100                                                        // No se permite más de 100 por criterio.
        },
        cumplido: {
          type: Boolean,                                                  // true si el criterio está cumplido.
          default: false                                                  // Por defecto, no cumplido.
        },
        fechaCumplimiento: {
          type: Date                                                      // Fecha en que se marcó como cumplido (si aplica).
        }
      }
    ],

    /**
     * Materiales asignados al proyecto.
     * Cada entrada vincula el proyecto con un material del inventario,
     * registrando:
     *  - cantidadAsignada: lo que se reserva para el proyecto.
     *  - cantidadUtilizada: lo que ya se consumió.
     *  - fechaAsignacion: cuándo se asignó.
     *  - movimientoInventario: referencia al movimiento de salida que
     *    dejó reservado ese material al proyecto (para trazabilidad).
     */
    materiales: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,                           // Id del material en inventario.
          ref: 'Material',                                                // Referencia al modelo de materiales.
          required: true                                                  // Siempre debe haber un material asociado.
        },
        cantidadAsignada: {
          type: Number,                                                   // Cantidad total asignada al proyecto.
          required: true,                                                 // Obligatorio.
          min: 0                                                          // No se aceptan cantidades negativas.
        },
        cantidadUtilizada: {
          type: Number,                                                   // Cantidad que ya se consumió.
          default: 0,                                                     // Por defecto, nada consumido.
          min: 0                                                          // No puede ser negativa.
        },
        fechaAsignacion: {
          type: Date,                                                     // Fecha en que se asignó el material.
          default: Date.now                                               // Por defecto, fecha actual.
        },
        movimientoInventario: {
          type: mongoose.Schema.Types.ObjectId,                           // Movimiento de inventario asociado.
          ref: 'MovimientoInventario'                                     // Referencia al modelo de movimientos.
        }
      }
    ]
    // ❗ No declaramos createdAt/updatedAt aquí porque lo maneja automáticamente "timestamps".
  },
  {
    timestamps: true                                                      // Genera automáticamente createdAt y updatedAt.
  }
);

// --------------------------------------------------------
// Índices para soportar filtros de búsqueda de proyectos
// --------------------------------------------------------

ProyectoSchema.index(
  {
    title: 1,                                                             // Permite buscar por título.
    pais: 1,                                                              // Filtrado por país.
    ciudad: 1,                                                            // Filtrado por ciudad.
    type: 1,                                                              // Filtrado por tipo de proyecto.
    priority: 1,                                                          // Filtrado por prioridad.
    status: 1,                                                            // Filtrado por estado.
    lider: 1,                                                             // Filtrado por líder de obra.
    cliente: 1                                                            // Filtrado por cliente.
  },
  {
    name: 'idx_proyectos_filtros_generales'                               // Nombre del índice compuesto.
  }
);

// Índice adicional por fecha de creación para soportar:
//  - Estadísticas mensuales (getStatsOverview).
//  - Listados ordenados por proyectos recientes.
ProyectoSchema.index(
  { createdAt: -1 },                                                      // Ordena por fecha de creación descendente.
  { name: 'idx_proyectos_createdAt_desc' }                                // Nombre del índice de soporte a listados/estadísticas.
);

// --------------------------------------------------------
// Métodos de instancia del esquema de Proyectos
// --------------------------------------------------------

/**
 * Calcula el costo total de los materiales asignados al proyecto.
 * Multiplica la cantidad asignada por el precio unitario de cada
 * material. Devuelve un número (suma en la misma moneda de precioUnitario).
 */
ProyectoSchema.methods.calcularCostoMateriales = async function () {
  // Carga los documentos de Material vinculados a cada entrada de materiales.
  await this.populate('materiales.material');                             // Poblamos los materiales para tener acceso a precioUnitario.

  // Aseguramos trabajar siempre con un arreglo (aunque materiales venga undefined o nulo).
  const materialesAsignados = Array.isArray(this.materiales)
    ? this.materiales
    : [];

  // Recorre el arreglo de materiales y acumula el costo total.
  return materialesAsignados.reduce((total, item) => {
    const precio = (item.material && item.material.precioUnitario) || 0;
    // Para calcular el costo ejecutado tomamos la cantidad utilizada en vez de la asignada.
    // De esta manera el costo de materiales refleja lo que realmente se ha consumido y no solo
    // lo que se asignó al proyecto. Si no se ha consumido nada, cantidadUtilizada será 0.
    const cantidad = Number(item.cantidadUtilizada) || 0;
    return total + cantidad * precio;
  }, 0);
};

/**
 * Verifica la disponibilidad de materiales en inventario con respecto
 * a las cantidades asignadas al proyecto.
 *
 * Devuelve un arreglo de objetos con los materiales faltantes, donde
 * cada objeto contiene:
 *  - material: nombre del material.
 *  - requerido: cantidad asignada al proyecto.
 *  - disponible: cantidad disponible en inventario.
 *  - faltante: cuánto hace falta para cubrir lo asignado.
 */
ProyectoSchema.methods.verificarDisponibilidad = async function () {
  // Poblamos los materiales para acceder a nombre y cantidad actual.
  await this.populate('materiales.material');                             // Asegura que cada material tenga sus datos cargados.

  // Igual que arriba, normalizamos el arreglo de materiales para evitar errores.
  const materialesAsignados = Array.isArray(this.materiales)
    ? this.materiales
    : [];

  const faltantes = [];                                                   // Arreglo donde se acumulan materiales con déficit.

  for (const item of materialesAsignados) {                               // Recorremos cada material asignado al proyecto.
    // Si por alguna razón el material no está poblado, lo saltamos.
    if (!item.material) {
      continue;                                                           // Evita romper si hay datos inconsistentes.
    }

    const disponible = Number(item.material.cantidad) || 0;               // Cantidad disponible actualmente en inventario.
    const requerido = Number(item.cantidadAsignada) || 0;                 // Cantidad requerida para el proyecto.

    // Si la cantidad disponible es menor a la asignada, se considera faltante.
    if (disponible < requerido) {
      faltantes.push({
        material: item.material.nombre,                                   // Nombre del material.
        requerido,                                                        // Cantidad requerida.
        disponible,                                                       // Cantidad actual disponible.
        faltante: requerido - disponible                                  // Diferencia que hace falta.
      });
    }
  }

  return faltantes;                                                       // Devuelve listado de materiales con déficit.
};

module.exports = mongoose.model('Proyectos', ProyectoSchema);             // Exporta el modelo "Proyectos" para usarlo en controladores.
