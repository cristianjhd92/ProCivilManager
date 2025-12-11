// File: BackEnd/src/modules/inventory/controllers/material.controlador.js
// Description: Controlador para gestionar los materiales de inventario en ProCivil Manager (PCM).
//              Implementa operaciones CRUD sobre materiales, aplicando eliminación lógica
//              (isDeleted) y generando alertas de stock bajo para administradores, incluyendo
//              notificaciones en tiempo real vía Socket.io cuando la cantidad está en o por
//              debajo del stock mínimo configurado.

// Importa el modelo de Material, que representa cada ítem de inventario.
const Material = require('../models/material.modelo');                         // Modelo de materiales de inventario

// Importa el modelo de Almacén para validar la pertenencia de un material a un almacén.
const Almacen = require('../../warehouses/models/almacen.modelo');             // Modelo de almacenes físicos

// Importa el modelo de Alerta para registrar alertas de stock mínimo.
const Alerta = require('../../alerts/models/alerta.modelo');                   // Modelo de alertas del sistema

// Importa el modelo de Usuario para localizar a los administradores que recibirán las alertas.
const User = require('../../users/models/usuario.modelo');                     // Modelo de usuarios (admin, líder, cliente)

/**
 * Crear un nuevo material de inventario.
 *
 * - Valida que se envíe al menos el nombre del material.
 * - Si se indica un almacén, verifica que exista.
 * - Crea el documento en la colección "materiales".
 * - Si la cantidad inicial está en o por debajo del stock mínimo, genera
 *   alertas de tipo "stock" para todos los administradores activos y emite
 *   un evento en tiempo real.
 */
exports.createMaterial = async (req, res) => {
  try {
    // Extrae y normaliza los campos relevantes del cuerpo de la petición.
    const {
      nombre,
      categoria,
      unidad,
      precioUnitario,
      cantidad,
      stockMinimo,
      almacen,
    } = req.body;

    // ╭──────────────────────────────────────────────╮
    // │ Validaciones obligatorias y de negocio       │
    // ╰──────────────────────────────────────────────╯
    // Todas las cadenas deben existir y no ser vacías.
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre del material es obligatorio' });
    }
    if (!categoria || !String(categoria).trim()) {
      return res.status(400).json({ message: 'La categoría del material es obligatoria' });
    }
    if (!unidad || !String(unidad).trim()) {
      return res.status(400).json({ message: 'La unidad del material es obligatoria' });
    }
    // precioUnitario, cantidad y stockMinimo deben poder convertirse a número y ser >= 0.
    const precioNum = parseFloat(precioUnitario);
    const cantidadNum = parseFloat(cantidad);
    const stockMinNum = parseFloat(stockMinimo);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      return res.status(400).json({ message: 'El precio unitario es obligatorio y debe ser un número no negativo' });
    }
    if (Number.isNaN(cantidadNum) || cantidadNum < 0) {
      return res.status(400).json({ message: 'La cantidad inicial es obligatoria y debe ser un número no negativo' });
    }
    if (Number.isNaN(stockMinNum) || stockMinNum < 0) {
      return res.status(400).json({ message: 'El stock mínimo es obligatorio y debe ser un número no negativo' });
    }
    // El material siempre debe estar asignado a un almacén.
    if (!almacen) {
      return res.status(400).json({ message: 'El material debe estar asignado a un almacén' });
    }
    // Verifica que el almacén exista.
    const almacenExistente = await Almacen.findById(almacen);
    if (!almacenExistente) {
      return res.status(404).json({ message: 'El almacén especificado no existe' });
    }

    // ╭──────────────────────────────────────────────╮
    // │ Prevención de duplicados                      │
    // ╰──────────────────────────────────────────────╯
    // Normaliza las cadenas para comparación (trim + toLowerCase).
    const nombreNorm = String(nombre).trim().toLowerCase();
    const categoriaNorm = String(categoria).trim().toLowerCase();
    const unidadNorm = String(unidad).trim().toLowerCase();

    // Busca si ya existe un material activo con la misma combinación de nombre, categoría y unidad (ignorando mayúsculas).
    // Permite que exista el mismo material (nombre, categoría, unidad) en almacenes distintos.
    // Solo consideramos duplicado si coincide el mismo almacén y las propiedades clave.
    const materialDuplicado = await Material.findOne({
      isDeleted: false,
      nombre: { $regex: new RegExp(`^${nombreNorm}$`, 'i') },
      categoria: { $regex: new RegExp(`^${categoriaNorm}$`, 'i') },
      unidad: { $regex: new RegExp(`^${unidadNorm}$`, 'i') },
      almacen,
    });

    if (materialDuplicado) {
      return res.status(409).json({ message: 'Ya existe un material con el mismo nombre, categoría y unidad' });
    }

    // Construye el objeto del nuevo material con los datos normalizados y numéricos.
    const nuevoMaterial = new Material({
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      unidad: unidad.trim(),
      precioUnitario: precioNum,
      cantidad: cantidadNum,
      stockMinimo: stockMinNum,
      almacen,
    });

    // Guarda el material en base de datos.
    await nuevoMaterial.save();

    // ╭──────────────────────────────────────────────╮
    // │ Generación de alertas de stock bajo          │
    // ╰──────────────────────────────────────────────╯
    try {
      // Solo genera alerta si hay stock mínimo > 0 y la cantidad inicial es <= stockMin.
      if (!Number.isNaN(stockMinNum) && stockMinNum > 0 && cantidadNum <= stockMinNum) {
        // Buscar administradores activos.
        const admins = await User.find({ role: 'admin', isDeleted: { $ne: true } });
        if (admins.length > 0) {
          const alertPromises = admins.map((admin) =>
            Alerta.create({
              usuario: admin._id,
              tipo: 'stock',
              material: nuevoMaterial._id,
              message: `El material "${nuevoMaterial.nombre}" ha sido creado con stock bajo (${cantidadNum} ${nuevoMaterial.unidad || ''}, mínimo ${stockMinNum}).`,
              resolved: false,
            }),
          );
          const alertasCreadas = await Promise.all(alertPromises);
          // Emitir alertas en tiempo real vía Socket.io.
          const io = req.app && req.app.get ? req.app.get('io') : null;
          if (io) {
            alertasCreadas.forEach((alerta) => {
              io.emit('alerta:nueva', { alerta });
            });
          }
        }
      }
    } catch (alertError) {
      console.error('❌ Error al generar alerta de stock mínimo al crear material:', alertError);
    }

    // Responde al cliente con el material creado.
    return res.status(201).json({
      message: '✅ Material agregado exitosamente',
      data: nuevoMaterial,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error('❌ Error de validación al crear el material:', error);
      return res.status(400).json({
        message: 'Datos inválidos para crear el material',
        error: error.message,
      });
    }
    console.error('❌ Error al crear el material:', error);
    return res.status(500).json({
      message: 'Error al crear el material',
      error: error.message,
    });
  }
};

/**
 * Obtener todos los materiales activos.
 *
 * - Solo retorna materiales con isDeleted = false (eliminación lógica).
 * - Incluye información básica del almacén relacionado mediante populate.
 */
exports.getMateriales = async (req, res) => {
  try {
    // Busca todos los materiales que NO estén marcados como eliminados.
    const materiales = await Material.find({ isDeleted: false })       // Filtro por eliminación lógica
      .populate('almacen', 'nombre direccion telefono');               // Trae datos básicos del almacén

    // Devuelve el arreglo de materiales al cliente.
    return res.status(200).json(materiales);
  } catch (error) {
    // Log de error en servidor.
    console.error('❌ Error al obtener los materiales:', error);
    // Respuesta de error genérica al cliente.
    return res.status(500).json({
      message: 'Error al obtener los materiales',                      // Mensaje genérico
      error: error.message                                             // Detalle del error
    });
  }
};

/**
 * Obtener un material específico por su ID.
 *
 * - Solo devuelve el material si isDeleted = false.
 * - Retorna 404 si el material no existe o está eliminado lógicamente.
 */
exports.getMaterialById = async (req, res) => {
  try {
    // Busca el material por ID y se asegura de que no esté marcado como eliminado.
    const material = await Material.findOne({
      _id: req.params.id,                                              // ID recibido en la ruta
      isDeleted: false                                                 // Solo materiales activos
    }).populate('almacen', 'nombre direccion telefono');               // Incluye datos del almacén

    // Si no se encuentra el material, responde con 404.
    if (!material) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    // Devuelve el material encontrado.
    return res.status(200).json(material);
  } catch (error) {
    // Log del error en consola del servidor.
    console.error('❌ Error al obtener el material:', error);
    // Respuesta genérica de error al cliente.
    return res.status(500).json({
      message: 'Error al obtener el material',                         // Mensaje genérico
      error: error.message                                             // Detalle del error
    });
  }
};

/**
 * Actualizar un material existente.
 *
 * - Valida (si se envía) que el almacén exista.
 * - Solo actualiza materiales con isDeleted = false.
 * - Reglas de rol:
 *    🔹 admin         → puede actualizar cualquier campo del material.
 *    🔹 lider de obra → solo puede actualizar campos "menores":
 *                       nombre, categoria, unidad, almacen, etc.
 *      No puede modificar: cantidad, stockMinimo, precioUnitario.
 * - Si (y solo si) se modifican cantidad o stockMinimo y el stock
 *   queda en o por debajo del mínimo, se generan alertas de stock
 *   bajo y notificaciones en tiempo real para administradores.
 */
exports.updateMaterial = async (req, res) => {
  try {
    // Rol del usuario autenticado (viene del middleware de autenticación)
    const rolUsuario = req.user && req.user.role ? req.user.role : null;

    // Clonamos los datos enviados por el cliente
    const body = { ...req.body };

    // Campos sensibles que SOLO puede tocar un administrador
    const camposRestringidosParaLider = [
      'cantidad',
      'stockMinimo',
      'precioUnitario'
    ];

    // Si el rol es "lider de obra", verificamos si intenta modificar campos restringidos
    if (rolUsuario === 'lider de obra') {
      const intentosRestringidos = Object.keys(body).filter((campo) =>
        camposRestringidosParaLider.includes(campo)
      );

      // Si intenta cambiar alguno de estos campos, devolvemos 403 y no continuamos
      if (intentosRestringidos.length > 0) {
        return res.status(403).json({
          message:
            'No tienes permiso para modificar la cantidad, el stock mínimo ni el precio unitario del material. ' +
            'Solo un administrador puede cambiar estos campos.',
          camposRestringidos: intentosRestringidos
        });
      }
    }

    // A partir de aquí, usamos body como base de los datos permitidos a actualizar
    const updateData = { ...body };

    // 🧹 Si el campo almacen viene como cadena vacía o null, lo eliminamos del update
    if (updateData.almacen === '' || updateData.almacen === null) {
      delete updateData.almacen;
    }

    // 🧠 Validar existencia del almacén si se envía un ID en la actualización.
    if (updateData.almacen) {
      const almacenExistente = await Almacen.findById(updateData.almacen);
      if (!almacenExistente) {
        return res.status(404).json({ message: 'El almacén especificado no existe' });
      }
    }

    // Obtiene el material actual para poder validar duplicados y campos obligatorios.
    const materialActual = await Material.findOne({ _id: req.params.id, isDeleted: false });
    if (!materialActual) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    // Determinar los valores finales que tendrá el material tras la actualización.
    const nuevoNombre =
      updateData.nombre !== undefined ? String(updateData.nombre).trim() : materialActual.nombre;
    const nuevaCategoria =
      updateData.categoria !== undefined ? String(updateData.categoria).trim() : materialActual.categoria;
    const nuevaUnidad =
      updateData.unidad !== undefined ? String(updateData.unidad).trim() : materialActual.unidad;
    const nuevoPrecio =
      updateData.precioUnitario !== undefined
        ? parseFloat(updateData.precioUnitario)
        : materialActual.precioUnitario;
    const nuevaCantidad =
      updateData.cantidad !== undefined ? parseFloat(updateData.cantidad) : materialActual.cantidad;
    const nuevoStockMin =
      updateData.stockMinimo !== undefined ? parseFloat(updateData.stockMinimo) : materialActual.stockMinimo;
    const nuevoAlmacen = updateData.almacen !== undefined ? updateData.almacen : materialActual.almacen;

    // Verifica que todos los campos obligatorios permanezcan diligenciados.
    if (!nuevoNombre || !nuevaCategoria || !nuevaUnidad) {
      return res.status(400).json({ message: 'Nombre, categoría y unidad son obligatorios' });
    }
    if (Number.isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      return res.status(400).json({ message: 'El precio unitario es obligatorio y debe ser un número no negativo' });
    }
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 0) {
      return res.status(400).json({ message: 'La cantidad es obligatoria y debe ser un número no negativo' });
    }
    if (Number.isNaN(nuevoStockMin) || nuevoStockMin < 0) {
      return res.status(400).json({ message: 'El stock mínimo es obligatorio y debe ser un número no negativo' });
    }
    if (!nuevoAlmacen) {
      return res.status(400).json({ message: 'El material debe estar asignado a un almacén' });
    }

    // ╭──────────────────────────────────────────────╮
    // │ Prevención de duplicados en actualización    │
    // ╰──────────────────────────────────────────────╯
    // Normaliza a minúsculas para comparar nombres, categorías y unidades.
    const nombreNorm = nuevoNombre.trim().toLowerCase();
    const categoriaNorm = nuevaCategoria.trim().toLowerCase();
    const unidadNorm = nuevaUnidad.trim().toLowerCase();

    const materialDuplicado = await Material.findOne({
      _id: { $ne: req.params.id },
      isDeleted: false,
      nombre: { $regex: new RegExp(`^${nombreNorm}$`, 'i') },
      categoria: { $regex: new RegExp(`^${categoriaNorm}$`, 'i') },
      unidad: { $regex: new RegExp(`^${unidadNorm}$`, 'i') },
    });
    if (materialDuplicado) {
      return res.status(409).json({ message: 'Ya existe otro material con el mismo nombre, categoría y unidad' });
    }

    // Determinar si en esta actualización se están tocando campos que afectan el stock
    const camposQueAfectanStock = ['cantidad', 'stockMinimo'];
    const debeEvaluarStock = camposQueAfectanStock.some((campo) => Object.prototype.hasOwnProperty.call(updateData, campo));

    // Aplica los valores normalizados al updateData para garantizar coherencia.
    updateData.nombre = nuevoNombre;
    updateData.categoria = nuevaCategoria;
    updateData.unidad = nuevaUnidad;
    updateData.precioUnitario = nuevoPrecio;
    updateData.cantidad = nuevaCantidad;
    updateData.stockMinimo = nuevoStockMin;
    updateData.almacen = nuevoAlmacen;

    // Actualiza el material siempre y cuando no esté eliminado lógicamente.
    const actualizado = await Material.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updateData,
      { new: true },
    );

    // Si no se encuentra el material (o está eliminado), responde con 404.
    if (!actualizado) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    // 🆕 Bloque para generar alerta y emitir evento cuando el stock queda bajo.
    // Solo tiene sentido evaluarlo si en esta petición se modificó cantidad o stockMinimo.
    if (debeEvaluarStock) {
      try {
        // Convierte a número los campos de cantidad y stock mínimo.
        const cantidadNum = Number(actualizado.cantidad);              // Cantidad ya actualizada
        const stockMinNum = Number(actualizado.stockMinimo);           // Stock mínimo ya actualizado

        // Solo genera alerta si los valores son válidos y se cumple la condición de stock bajo.
        if (
          !Number.isNaN(cantidadNum) &&
          !Number.isNaN(stockMinNum) &&
          stockMinNum > 0 &&
          cantidadNum <= stockMinNum
        ) {
          // Busca todos los administradores activos.
          const admins = await User.find({
            role: 'admin',                                             // Rol administrador
            isDeleted: { $ne: true }                                   // Excluye admins eliminados lógicamente
          });

          // Si hay administradores se generan alertas para cada uno.
          if (admins.length > 0) {
            const alertPromises = admins.map((admin) =>
              Alerta.create({
                usuario: admin._id,                                    // Destinatario de la alerta
                tipo: 'stock',                                         // Tipo: alerta de stock
                material: actualizado._id,                             // Referencia al material
                message: `Stock bajo para el material "${actualizado.nombre}": ${cantidadNum} ${actualizado.unidad || ''} (mínimo ${stockMinNum}).`,
                resolved: false                                        // Se crea como no resuelta
              })
            );

            // Espera la creación de todas las alertas.
            const alertasCreadas = await Promise.all(alertPromises);   // Arreglo de alertas creadas

            // Obtiene la instancia de Socket.io desde la app.
            const io =
              req.app && typeof req.app.get === 'function'
                ? req.app.get('io')
                : null;

            if (io) {
              // Emite un evento por cada alerta nueva.
              alertasCreadas.forEach((alerta) => {
                io.emit('alerta:nueva', { alerta });                   // Evento global para que el frontend actualice contadores
              });
            }
          }
        }
      } catch (alertError) {
        // Cualquier error en la generación de alertas no rompe la actualización del material.
        console.error(
          '❌ Error al generar alerta de stock mínimo al actualizar material:',
          alertError
        );
      }
    }

    // Responde con el material actualizado.
    return res.status(200).json({
      message: '✅ Material actualizado correctamente',                // Mensaje de éxito
      data: actualizado                                                // Documento ya actualizado
    });
  } catch (error) {
    // Manejo explícito de errores de validación (e.g., valores negativos).
    if (error.name === 'ValidationError') {
      console.error('❌ Error de validación al actualizar el material:', error);
      return res.status(400).json({
        message: 'Datos inválidos para actualizar el material',        // Mensaje genérico de datos inválidos
        error: error.message                                           // Detalle del error
      });
    }

    // Cualquier otro error es tratado como error interno.
    console.error('❌ Error al actualizar el material:', error);
    return res.status(500).json({
      message: 'Error al actualizar el material',                       // Mensaje genérico
      error: error.message                                              // Detalle
    });
  }
};

/**
 * Eliminar un material (eliminación lógica).
 *
 * - No se borra el documento físicamente, solo se marca isDeleted = true.
 * - Permite mantener historial de movimientos e integridad referencial.
 */
exports.deleteMaterial = async (req, res) => {
  try {
    // Busca el material por ID y se asegura de que no esté ya eliminado.
    const material = await Material.findOne({
      _id: req.params.id,                                              // ID a eliminar
      isDeleted: false                                                 // Solo materiales activos
    });

    // Si no se encuentra, responde con 404.
    if (!material) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    // 🧮 Si el material tiene stock, no permitimos eliminarlo. Avisamos al usuario con el detalle.
    const cantidadActual = Number(material.cantidad) || 0;
    if (cantidadActual > 0) {
      // Intentar obtener el nombre del almacén para un mensaje más claro (si está referenciado).
      let nombreAlmacen = '';
      try {
        const materialPopulado = await material.populate('almacen', 'nombre');
        nombreAlmacen = materialPopulado.almacen ? materialPopulado.almacen.nombre : '';
      } catch (e) {
        nombreAlmacen = '';
      }
      return res.status(400).json({
        message: `No se puede eliminar el material porque tiene ${cantidadActual} unidades en el almacén${nombreAlmacen ? ' ' + nombreAlmacen : ''}.`,
      });
    }

    // Marca el material como eliminado lógicamente.
    material.isDeleted = true;
    await material.save();

    // Responde con mensaje de confirmación.
    return res.status(200).json({ message: '🗑️ Material eliminado correctamente' });
  } catch (error) {
    // Log del error en consola del servidor.
    console.error('❌ Error al eliminar el material:', error);
    // Respuesta genérica de error al cliente.
    return res.status(500).json({
      message: 'Error al eliminar el material',                        // Mensaje genérico
      error: error.message                                             // Detalle
    });
  }
};
