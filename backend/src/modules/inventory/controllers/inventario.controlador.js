// File: BackEnd/src/modules/inventory/controllers/inventario.controlador.js
// Description: Controlador para gestionar los movimientos de inventario
//              (entradas, salidas y ajustes) de materiales en los almacenes.
//              Actualiza el stock, genera alertas de stock mínimo y expone
//              endpoints para listar, actualizar y eliminar movimientos.

const MovimientoInventario = require('../models/inventario.modelo');             // Modelo de historial de movimientos de inventario
const Material = require('../models/material.modelo');                           // Modelo de materiales (stock y datos básicos)
const Almacen = require('../../warehouses/models/almacen.modelo');               // Modelo de almacenes (bodegas físicas)

// 🆕 Modelos adicionales para alertas de stock mínimo en tiempo real
const Alerta = require('../../alerts/models/alerta.modelo');                     // Modelo de alertas del sistema
const User = require('../../users/models/usuario.modelo');                       // Modelo de usuarios (para notificar administradores)

/**
 * 🟢 Crear un nuevo movimiento de inventario.
 *
 * Tipos soportados:
 *  - 'entrada': incrementa stock.
 *  - 'salida' : disminuye stock.
 *  - 'ajuste' : fija el stock a una cantidad específica.
 *
 * Reglas:
 *  - El líder de obra SOLO puede registrar movimientos de SALIDA.
 *  - Se valida que exista el material y el almacén.
 *  - Se actualiza el stock del material.
 *  - Si se cruza el stock mínimo hacia abajo, se generan alertas a admins.
 *  - Se registran también: descripcion, motivo, proyecto,
 *    stockAnterior y stockNuevo para trazabilidad completa.
 */
exports.createMovimiento = async (req, res) => {
  try {
    // Extraemos datos principales desde el cuerpo de la petición
    const {
      material,           // Id del material afectado
      tipo,               // Tipo de movimiento: entrada / salida / ajuste
      cantidad,           // Cantidad enviada (puede venir como string)
      descripcion,        // Descripción corta que ve el usuario
      almacen,            // Id del almacén
      proyecto,           // Id de proyecto asociado (opcional)
      motivo,             // Motivo estructurado (opcional)
      observaciones       // Observaciones detalladas (opcional)
    } = req.body;

    // ⛔ Regla de negocio: el líder de obra SOLO puede registrar movimientos de SALIDA
    if (req.user && req.user.role === 'lider de obra' && tipo !== 'salida') {
      return res.status(403).json({
        message:
          'Los líderes de obra solo pueden registrar movimientos de salida (consumo de material).',
      });
    }

    // 🔢 Normalizamos y validamos la cantidad (aseguramos número > 0)
    const cantidadNum = Number(cantidad);                  // Convertimos la cantidad a número
    if (
      !material ||                                         // Debe existir id de material
      !tipo ||                                             // Debe indicar tipo de movimiento
      !almacen ||                                          // Debe indicar almacén
      isNaN(cantidadNum) ||                                // Cantidad debe ser numérica
      cantidadNum <= 0                                     // Y estrictamente positiva
    ) {
      return res
        .status(400)
        .json({ message: 'Faltan campos obligatorios o la cantidad no es válida.' });
    }

    // ✅ Validar tipo de movimiento permitido
    const tiposPermitidos = ['entrada', 'salida', 'ajuste']; // Lista de tipos válidos
    if (!tiposPermitidos.includes(tipo)) {                   // Si el tipo no está en la lista
      return res.status(400).json({
        message:
          "Tipo de movimiento inválido. Debe ser 'entrada', 'salida' o 'ajuste'.",
      });
    }

    // 🔍 Verificar que el material exista
    const materialDB = await Material.findById(material);    // Buscamos el material en BD
    if (!materialDB) {                                       // Si no existe, error 404
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    // 🆕 Guardar cantidad previa y stock mínimo para evaluar alertas de stock
    const cantidadAnterior = Number(materialDB.cantidad) || 0; // Stock antes del movimiento
    const stockMinNum = Number(materialDB.stockMinimo) || 0;   // Stock mínimo configurado

    // 🔍 Verificar que el almacén exista
    const almacenDB = await Almacen.findById(almacen);      // Buscamos el almacén
    if (!almacenDB) {                                       // Si no existe, error 404
      return res.status(404).json({ message: 'Almacén no encontrado' });
    }

    // 🔄 Actualizar el stock según tipo de movimiento
    if (tipo === 'entrada') {
      // Entrada: sumamos unidades al stock actual
      materialDB.cantidad = cantidadAnterior + cantidadNum;
    } else if (tipo === 'salida') {
      // Salida: verificamos que haya stock suficiente antes de descontar
      if (cantidadNum > cantidadAnterior) {
        return res.status(400).json({
          message: 'No hay suficiente stock para esta salida.',
        });
      }
      materialDB.cantidad = cantidadAnterior - cantidadNum;
    } else if (tipo === 'ajuste') {
      // Ajuste: fijamos el stock a la cantidad indicada
      materialDB.cantidad = cantidadNum;
    }

    // 🧮 Calculamos el stock nuevo después de aplicar el movimiento
    const cantidadNueva = Number(materialDB.cantidad) || 0;  // Stock después del movimiento

    // 💾 Guardamos el material ya actualizado en la base de datos
    await materialDB.save();

    // 🧾 Determinar motivo estructurado si no viene explícito en el body
    const motivoMovimiento =
      motivo ||                                              // Si el cliente envía motivo, usamos ese
      (tipo === 'entrada'
        ? `Entrada manual en almacén ${almacenDB.nombre}`
        : tipo === 'salida'
        ? `Salida manual en almacén ${almacenDB.nombre}`
        : `Ajuste manual en almacén ${almacenDB.nombre}`);

    // 📝 Determinar observaciones: si no viene, reutilizamos la descripción como fallback
    const observacionesMovimiento =
      observaciones !== undefined && observaciones !== null
        ? observaciones
        : descripcion || '';

    // 📝 Crear el movimiento de inventario (ya con el stock validado)
    const nuevoMovimiento = new MovimientoInventario({
      material,                                              // Id del material
      almacen,                                               // Id del almacén
      tipo,                                                  // Tipo de movimiento (entrada/salida/ajuste)
      cantidad: cantidadNum,                                 // Cantidad numérica ya normalizada
      fecha: new Date(),                                     // Fecha del movimiento (además de createdAt)
      descripcion: descripcion || '',                        // Descripción corta visible en la UI
      observaciones: observacionesMovimiento,                // Observaciones más detalladas
      proyecto: proyecto || undefined,                       // Proyecto asociado si aplica
      motivo: motivoMovimiento,                              // Motivo estructurado del movimiento
      stockAnterior: cantidadAnterior,                       // Stock antes del movimiento
      stockNuevo: cantidadNueva,                             // Stock después del movimiento
      // Guardamos información básica del usuario para trazabilidad
      usuario: req.user
        ? req.user.email || req.user.id || String(req.user._id || '')
        : 'sistema',                                         // En caso de tareas automáticas
    });

    // 💾 Guardamos el movimiento en la colección de movimientos
    await nuevoMovimiento.save();

    // 🆕 Después de actualizar el stock, evaluar si se cruza el umbral de stock mínimo
    try {
      // Solo generamos alerta si:
      //  - hay stock mínimo configurado (> 0)
      //  - ANTES estaba por encima del mínimo
      //  - AHORA quedó en o por debajo del mínimo
      if (
        stockMinNum > 0 &&
        cantidadAnterior > stockMinNum &&
        cantidadNueva <= stockMinNum
      ) {
        // 👥 Buscar administradores activos (no eliminados lógicamente)
        const admins = await User.find({
          role: 'admin',
          isDeleted: { $ne: true },
        });

        if (admins.length > 0) {
          // Crear una alerta de stock bajo por cada admin
          const alertPromises = admins.map((admin) =>
            Alerta.create({
              usuario: admin._id,                           // Destinatario de la alerta
              tipo: 'stock',                                // Tipo de alerta (stock mínimo)
              material: materialDB._id,                     // Referencia al material
              message: `Stock bajo para el material "${materialDB.nombre}": ${cantidadNueva} ${materialDB.unidad || ''
                } (mínimo ${stockMinNum}).`,
              resolved: false,                              // Alerta pendiente
            })
          );

          const alertasCreadas = await Promise.all(alertPromises);

          // 📡 Emitir evento Socket.io para que el frontend se actualice en tiempo real
          const io = req.app && req.app.get ? req.app.get('io') : null; // Obtenemos instancia de Socket.io desde la app
          if (io) {
            alertasCreadas.forEach((alerta) => {
              io.emit('alerta:nueva', {
                alerta,                                      // Enviamos la alerta completa al cliente
              });
            });
          }
        }
      }
    } catch (alertError) {
      // Importante: si falla la creación de la alerta NO rompemos la respuesta principal
      console.error(
        '❌ Error al generar alerta de stock mínimo desde movimiento:',
        alertError
      );
    }

    // ✅ Respuesta exitosa con el movimiento creado y el material actualizado
    res.status(201).json({
      message: 'Movimiento registrado correctamente',
      data: {
        movimiento: nuevoMovimiento,                        // Movimiento recién creado
        materialActualizado: materialDB,                    // Estado actual del material
      },
    });
  } catch (error) {
    // Manejo específico de IDs mal formados
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Identificador inválido (material o almacén).',
        error: error.message,
      });
    }

    // Log de error técnico en el servidor
    console.error('❌ Error al crear movimiento:', error);
    // Respuesta genérica para el cliente
    res.status(500).json({
      message: 'Error al registrar el movimiento',
      error: error.message,
    });
  }
};

/**
 * 🔵 Obtener todos los movimientos de inventario.
 *
 * - Devuelve la lista completa de movimientos.
 * - Incluye datos básicos del material, almacén y proyecto (si aplica).
 * - Útil para vistas de historial global o reportes.
 */
exports.getMovimientos = async (req, res) => {
  try {
    const movimientos = await MovimientoInventario.find()   // Consultamos todos los movimientos
      .sort({ createdAt: -1 })                              // Orden: más recientes primero
      .populate(                                            // Poblamos datos básicos del material
        'material',
        'nombre categoria cantidad unidad precioUnitario'
      )
      .populate(                                            // Poblamos datos básicos del almacén
        'almacen',
        'nombre direccion telefono'
      )
      .populate(                                            // Datos del proyecto asociado (si existe)
        'proyecto',
        'title location status'
      );

    res.status(200).json(movimientos);                      // Devolvemos lista de movimientos
  } catch (error) {
    console.error('❌ Error al obtener movimientos:', error);
    res.status(500).json({
      message: 'Error al obtener los movimientos',
      error: error.message,
    });
  }
};

/**
 * 🟣 Obtener movimientos para un material específico.
 *
 * - Filtra por el ID de material recibido en params.
 * - Incluye populate de material, almacén y proyecto.
 * - Útil para ver el historial de un solo insumo.
 */
exports.getMovimientosByMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;                     // Id del material recibido en la URL

    const movimientos = await MovimientoInventario.find({
      material: materialId,                                // Filtramos por material
    })
      .sort({ createdAt: -1 })                             // Historial: más reciente primero
      .populate(                                           // Datos del material
        'material',
        'nombre categoria cantidad unidad precioUnitario'
      )
      .populate(                                           // Datos del almacén
        'almacen',
        'nombre direccion telefono'
      )
      .populate(                                           // Datos del proyecto asociado
        'proyecto',
        'title location status'
      );

    res.status(200).json(movimientos);                     // Devolvemos historial filtrado
  } catch (error) {
    // IDs mal formados (CastError) → 400
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'ID de material inválido',
        error: error.message,
      });
    }

    console.error('❌ Error al obtener movimientos por material:', error);
    res.status(500).json({
      message: 'Error al obtener los movimientos del material',
      error: error.message,
    });
  }
};

/**
 * 🟠 Actualizar un movimiento de inventario.
 *
 * Por diseño, este endpoint solo permite actualizar:
 *  - tipo (entrada / salida / ajuste)
 *  - descripcion (campo corto)
 *  - observaciones (detalle largo)
 *  - motivo (texto estructurado)
 *
 * ⚠️ NO recalcula ni revierte stock aquí. Cualquier cambio en stock
 *     debe hacerse a través de la creación de nuevos movimientos,
 *     para mantener la trazabilidad clara.
 */
exports.updateMovimiento = async (req, res) => {
  try {
    const {
      tipo,             // Tipo de movimiento nuevo (opcional)
      descripcion,      // Nueva descripción corta (opcional)
      observaciones,    // Nuevas observaciones (opcional)
      motivo            // Nuevo motivo estructurado (opcional)
    } = req.body;

    // Construimos un objeto de actualización solo con campos definidos
    const updateData = {};                                   // Objeto que enviaremos a findByIdAndUpdate

    // Si se envía un tipo nuevo, validamos que sea uno de los permitidos
    if (tipo !== undefined) {
      const tiposPermitidos = ['entrada', 'salida', 'ajuste']; // Lista de tipos válidos
      if (!tiposPermitidos.includes(tipo)) {                   // Si el tipo no es válido
        return res.status(400).json({
          message:
            "Tipo de movimiento inválido. Debe ser 'entrada', 'salida' o 'ajuste'.",
        });
      }
      updateData.tipo = tipo;                                 // Asignamos el nuevo tipo
    }

    // Si se envía una nueva descripción, actualizamos el campo descripcion
    if (descripcion !== undefined) {
      updateData.descripcion = descripcion;                   // Actualizamos descripción corta
    }

    // Si se envían nuevas observaciones, actualizamos el campo observaciones
    if (observaciones !== undefined) {
      updateData.observaciones = observaciones;               // Actualizamos detalle largo
    }

    // Si se envía un nuevo motivo, actualizamos el campo motivo
    if (motivo !== undefined) {
      updateData.motivo = motivo;                             // Actualizamos motivo estructurado
    }

    const actualizado = await MovimientoInventario.findByIdAndUpdate(
      req.params.id,                                          // ID del movimiento a actualizar
      updateData,                                             // Campos a actualizar
      { new: true }                                           // Devolver el documento ya actualizado
    );

    if (!actualizado) {                                       // Si no se encontró el movimiento
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    res.status(200).json({
      message: 'Movimiento actualizado correctamente',
      data: actualizado,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'ID de movimiento inválido',
        error: error.message,
      });
    }

    console.error('❌ Error al actualizar movimiento:', error);
    res.status(500).json({
      message: 'Error al actualizar el movimiento',
      error: error.message,
    });
  }
};

/**
 * 🔴 Eliminar un movimiento de inventario.
 *
 * ❗ Importante:
 *  - Esta operación NO revierte el stock del material.
 *  - Se asume que la eliminación es excepcional (errores de registro).
 *  - Cualquier corrección de stock debe realizarse mediante un NUEVO
 *    movimiento (entrada / salida / ajuste) para mantener trazabilidad.
 */
exports.deleteMovimiento = async (req, res) => {
  try {
    const eliminado = await MovimientoInventario.findByIdAndDelete(
      req.params.id                                           // ID del movimiento a eliminar
    );

    if (!eliminado) {                                         // Si no se encontró el documento
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    res.status(200).json({ message: 'Movimiento eliminado correctamente' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'ID de movimiento inválido',
        error: error.message,
      });
    }

    console.error('❌ Error al eliminar movimiento:', error);
    res.status(500).json({
      message: 'Error al eliminar el movimiento',
      error: error.message,
    });
  }
};
