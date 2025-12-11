// File: BackEnd/src/modules/budgets/controllers/presupuesto.controlador.js
// Description: Controlador para gestionar el presupuesto de materiales
//              por proyecto en ProCivil Manager (PCM). Permite crear o
//              actualizar el presupuesto de un proyecto y consultarlo,
//              registrando los cambios en la auditoría y notificando en
//              tiempo real vía Socket.io.

const PresupuestoMaterial = require('../models/presupuesto.modelo');            // Modelo de presupuesto de materiales por proyecto
const Proyecto = require('../../projects/models/proyecto.modelo');              // Modelo de proyectos (para validar que exista el proyecto)
const Material = require('../../inventory/models/material.modelo');             // Modelo de materiales (para validar cada ítem)
const AuditLog = require('../../audit/models/auditoria.modelo');                // Modelo de auditoría para registrar cambios

/**
 * Crear o actualizar el presupuesto de materiales para un proyecto.
 *
 * - Si ya existe un presupuesto para el proyecto → se actualiza.
 * - Si no existe → se crea uno nuevo.
 *
 * Lógica principal:
 *  1. Valida que el proyecto exista.
 *  2. Valida que totalPresupuesto sea un número válido.
 *  3. Recorre los ítems, valida cada línea y calcula la sumatoria.
 *  4. Si la sumatoria difiere del total, ajusta el total a la sumatoria.
 *  5. Guarda el presupuesto en la colección PresupuestoMaterial.
 *  6. Registra la acción en AuditLog.
 *  7. Emite un evento Socket.io para actualizar dashboards en tiempo real.
 *
 * Requisitos:
 *  - La ruta debe estar protegida por authMiddleware (para tener req.user).
 *  - La ruta debe usar authorizeRoles(['admin', 'lider de obra']).
 */
exports.createOrUpdatePresupuesto = async (req, res) => {
  const { proyectoId } = req.params;                  // Id del proyecto recibido en la URL
  let { totalPresupuesto, items } = req.body;         // Datos enviados desde el frontend (total e ítems)

  try {
    // 1️⃣ Validar que el proyecto exista en la base de datos
    const proyecto = await Proyecto.findById(proyectoId); // Busca el proyecto por id
    if (!proyecto) {                                      // Si no se encuentra, responde 404
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // 2️⃣ Validar que el total del presupuesto sea un número válido (>= 0)
    totalPresupuesto = Number(totalPresupuesto);          // Se intenta convertir a número
    if (isNaN(totalPresupuesto) || totalPresupuesto < 0) { // Si no es número o es negativo
      return res.status(400).json({
        message: 'El total del presupuesto debe ser un número mayor o igual a cero',
      });
    }

    // 3️⃣ Preparar detalle de ítems y calcular la sumatoria
    let sumaDetalle = 0;                                 // Acumulador para la sumatoria de subtotales
        const detalle = [];                                  // Arreglo donde se guardan los ítems validados

    // Si el frontend envía un arreglo de ítems, se procesa; si no, se deja vacío
    if (Array.isArray(items)) {
      // Recorremos cada ítem enviado en el cuerpo de la petición
      for (const item of items) {
        // Se desestructura cada ítem: material, cantidadPrevista y costoPrevisto
        const { material, cantidadPrevista, costoPrevisto } = item;

        // Validación básica: todos los campos deben estar presentes
        if (!material || cantidadPrevista === undefined || costoPrevisto === undefined) {
          return res.status(400).json({
            message:
              'Cada línea de presupuesto debe contener material, cantidadPrevista y costoPrevisto',
          });
        }

        // 3.1 Validar que el material exista en la colección de Materiales
        const materialDoc = await Material.findById(material); // Busca el material por id
        if (!materialDoc) {                                   // Si no existe, se responde 404
          return res.status(404).json({
            message: `Material con ID ${material} no encontrado`,
          });
        }

        // 3.2 Convertir cantidad y costo a número y validar que sean >= 0
        const cantidad = Number(cantidadPrevista);            // Se convierte cantidad a número
        const costo = Number(costoPrevisto);                  // Se convierte costo a número

        // Si alguno no es número o es negativo, se devuelve error 400
        if (
          isNaN(cantidad) || cantidad < 0 ||
          isNaN(costo) || costo < 0
        ) {
          return res.status(400).json({
            message:
              'La cantidad prevista y el costo previsto deben ser números mayores o iguales a cero',
          });
        }

        // 3.3 Calcular el subtotal de la línea (cantidad * costo)
        const subtotal = cantidad * costo;                    // Subtotal de ese ítem
        sumaDetalle += subtotal;                              // Acumulamos el subtotal en la sumatoria general

        // 3.4 Guardar el ítem normalizado en el arreglo detalle
        // Aseguramos que material sea un identificador en formato string y no un objeto
        // Esto previene errores en las operaciones posteriores (sincronización de stock)
        detalle.push({
          material: materialDoc._id ? materialDoc._id.toString() : String(material),
          cantidadPrevista: cantidad,                         // Cantidad prevista ya normalizada a número
          costoPrevisto: costo,                               // Costo previsto ya normalizado a número
        });
      }
    }

    // 4️⃣ Ajustar el total del presupuesto si hay ítems de detalle
    let mensajeAjuste = null;                                // Variable para guardar un mensaje de ajuste opcional

    if (detalle.length > 0) {                                // Solo tiene sentido comparar si hay ítems
      // Se comparan los valores redondeados a 2 decimales para evitar problemas de coma flotante
      const sumaRedondeada = Math.round(sumaDetalle * 100) / 100;
      const totalRedondeado = Math.round(totalPresupuesto * 100) / 100;

      // Si los valores difieren, se corrige el total al valor calculado
      if (sumaRedondeada !== totalRedondeado) {
        totalPresupuesto = sumaDetalle;                      // Se ajusta el total a la sumatoria de los ítems
        mensajeAjuste =
          'El total del presupuesto ha sido ajustado a la sumatoria de los ítems.';
      }
    }

    // 5️⃣ Verificar si ya existe un presupuesto para este proyecto
    let presupuesto = await PresupuestoMaterial.findOne({ proyecto: proyectoId }); // Busca presupuesto existente
    const isUpdate = !!presupuesto;                                                 // true si ya existía

    if (!presupuesto) {
      // 💾 Caso 5.1: no existe → se crea un nuevo documento de presupuesto
      presupuesto = new PresupuestoMaterial({
        proyecto: proyectoId,                             // Id del proyecto asociado
        totalPresupuesto,                                 // Total calculado (o ajustado)
        items: detalle,                                   // Ítems normalizados
        createdBy: req.user.id,                           // Usuario que crea el presupuesto
        updatedBy: req.user.id,                           // También se registra como último usuario que actualizó
      });
    } else {
      // 💾 Caso 5.2: sí existe → se actualiza el documento existente
      presupuesto.totalPresupuesto = totalPresupuesto;    // Actualiza el total del presupuesto
      presupuesto.items = detalle;                        // Reemplaza las líneas de detalle
      presupuesto.updatedBy = req.user.id;                // Actualiza el usuario que modificó el presupuesto
      // ⚠️ NO es necesario tocar updatedAt manualmente; Mongoose lo actualiza por timestamps:true
    }

    // Se guardan los cambios (creación o actualización) en la base de datos
    await presupuesto.save();

    // 🧮 Sincronizar las asignaciones de materiales del proyecto con el presupuesto
    // Una vez actualizado el presupuesto guardado, necesitamos reflejar los cambios en la
    // colección de proyectos de modo que las cantidades asignadas (cantidadAsignada) se
    // ajusten según las cantidades previstas del presupuesto. Esto permite que al modificar
    // el presupuesto se asignen o liberen materiales automáticamente y se actualice el
    // stock de inventario. Si un material nuevo se incluye en el presupuesto, se agrega
    // a la lista de materiales del proyecto; si se reduce o elimina, se reajusta el stock.
    try {
      // Obtenemos el proyecto completo para manipular la lista de materiales
      const proyectoActualizar = await Proyecto.findById(proyectoId).populate('materiales.material');
      if (proyectoActualizar) {
        // Construimos un mapa {materialId -> cantidadPrevista} para facilitar comparaciones
        const mapaNuevos = new Map();
        detalle.forEach((item) => {
          // item.material debe ser una cadena representando el ObjectId; sin embargo,
          // puede recibirse un documento poblado o un objeto en ciertas llamadas internas.
          let materialId;
          if (item.material && typeof item.material === 'object') {
            // Si es un documento Mongoose o un objeto con _id, usamos su id
            materialId = item.material._id ? item.material._id.toString() : String(item.material);
          } else {
            materialId = String(item.material);
          }
          mapaNuevos.set(materialId, Number(item.cantidadPrevista) || 0);
        });

        // Recorremos los materiales actualmente asignados al proyecto para actualizar o eliminar
        for (let i = proyectoActualizar.materiales.length - 1; i >= 0; i--) {
          const asignado = proyectoActualizar.materiales[i];
          // Obtiene el identificador del material asignado, manejando si viene poblado
          let idStr;
          if (asignado.material && typeof asignado.material === 'object') {
            idStr = asignado.material._id ? asignado.material._id.toString() : String(asignado.material);
          } else {
            idStr = String(asignado.material);
          }
          if (mapaNuevos.has(idStr)) {
            // El material continúa existiendo en el presupuesto; actualizamos su asignación
            const nuevaCant = mapaNuevos.get(idStr);
            const diferencia = nuevaCant - (Number(asignado.cantidadAsignada) || 0);
            if (diferencia !== 0) {
              // Ajustamos el stock global descontando o devolviendo la diferencia
              const matDoc = await Material.findById(idStr);
              if (matDoc) {
                matDoc.cantidad = (Number(matDoc.cantidad) || 0) - diferencia;
                if (matDoc.cantidad < 0) matDoc.cantidad = 0;
                await matDoc.save();
              }
              asignado.cantidadAsignada = nuevaCant;
              // Si la cantidad utilizada supera la nueva asignación, la recortamos
              if ((Number(asignado.cantidadUtilizada) || 0) > nuevaCant) {
                asignado.cantidadUtilizada = nuevaCant;
              }
            }
            // Marcamos este id como procesado
            mapaNuevos.delete(idStr);
          } else {
            // El material ya no está en el nuevo presupuesto; liberamos stock restante y lo eliminamos de la lista
            const pendienteDevolver = (Number(asignado.cantidadAsignada) || 0) - (Number(asignado.cantidadUtilizada) || 0);
            if (pendienteDevolver > 0) {
              const matDoc = await Material.findById(idStr);
              if (matDoc) {
                matDoc.cantidad = (Number(matDoc.cantidad) || 0) + pendienteDevolver;
                await matDoc.save();
              }
            }
            // Eliminamos el material de la lista del proyecto
            proyectoActualizar.materiales.splice(i, 1);
          }
        }

        // Los materiales restantes en mapaNuevos son nuevos y deben asignarse
        for (const [idStr, cantPrevista] of mapaNuevos.entries()) {
          // Reducimos el stock global
          const matDoc = await Material.findById(idStr);
          if (matDoc) {
            const nuevaCantidadInventario = (Number(matDoc.cantidad) || 0) - cantPrevista;
            matDoc.cantidad = nuevaCantidadInventario < 0 ? 0 : nuevaCantidadInventario;
            await matDoc.save();
          }
          proyectoActualizar.materiales.push({
            material: idStr,
            cantidadAsignada: cantPrevista,
            cantidadUtilizada: 0,
            fechaAsignacion: new Date(),
          });
        }

        // Guardamos el proyecto actualizado
        await proyectoActualizar.save();
      }
    } catch (syncError) {
      // En caso de errores en sincronización, se registra pero no afecta la respuesta
      console.error('Error al sincronizar materiales con presupuesto:', syncError);
    }

    // 6️⃣ Registrar la acción en la auditoría
    try {
      await AuditLog.create({
        user: req.user.id,                                // Usuario autenticado que ejecutó la acción
        action: isUpdate ? 'UPDATE_PRESUPUESTO' : 'CREATE_PRESUPUESTO', // Tipo de acción (en mayúsculas, más consistente)
        resource: 'Proyecto',                             // Tipo de recurso afectado
        details: {                                        // Detalle adicional para análisis futuro
          proyectoId: proyectoId.toString(),              // Proyecto al que pertenece el presupuesto
          totalPresupuesto,
          items: detalle,
          esActualizacion: isUpdate,
        },
      });
    } catch (auditError) {
      // Si falla la auditoría, se registra en consola pero no se rompe el flujo principal
      console.error('Error al registrar auditoría de presupuesto:', auditError);
    }

    // 7️⃣ Notificación en tiempo real vía Socket.io
    //    Esto permite que admin / líder / cliente vean los cambios sin recargar el navegador.
    try {
      // Obtenemos la instancia de Socket.io guardada en la aplicación (configurada en server.js)
      const io = req.app && req.app.get ? req.app.get('io') : null;

      if (io) {                                           // Solo si existe la instancia de io
        io.emit('presupuesto:actualizado', {              // Evento genérico de presupuesto actualizado
          proyectoId: proyectoId.toString(),              // Id del proyecto afectado
          totalPresupuesto,                               // Total del presupuesto actualizado
          numeroItems: detalle.length,                    // Número de ítems en el presupuesto
          esActualizacion: isUpdate,                      // true si fue update, false si fue creación
          actualizadoPor: req.user.id.toString(),         // Id del usuario que hizo el cambio
          actualizadoEn: new Date(),                      // Marca de tiempo del evento
        });
      }
    } catch (socketError) {
      // Si ocurre algún problema con Socket.io, se muestra en consola pero no afecta la respuesta HTTP
      console.error('Error al emitir evento de Socket.io para presupuesto:', socketError);
    }

    // 8️⃣ Preparar y enviar la respuesta HTTP al cliente
    const response = {
      message: isUpdate
        ? 'Presupuesto actualizado correctamente'
        : 'Presupuesto creado correctamente',
      presupuesto,                                       // Se devuelve el documento de presupuesto completo
    };

    // Si hubo ajuste automático del total, se agrega una nota en la respuesta
    if (mensajeAjuste) {
      response.notas = mensajeAjuste;
    }

    // Se responde con 200 si fue actualización, 201 si fue creación
    res.status(isUpdate ? 200 : 201).json(response);
  } catch (error) {
    // Si algo falla en el proceso, se registra el error en consola del servidor
    console.error('Error en createOrUpdatePresupuesto:', error);

    // Respuesta genérica de error al cliente
    res.status(500).json({ message: 'Error al guardar el presupuesto' });
  }
};

/**
 * Obtener el presupuesto de materiales para un proyecto.
 *
 * Devuelve:
 *  - El documento de presupuesto (con populate de los materiales).
 *  - La suma calculada de las líneas (sumaDetalle), para que el
 *    frontend pueda comparar contra totalPresupuesto.
 */
exports.getPresupuesto = async (req, res) => {
  const { proyectoId } = req.params;                        // Id del proyecto desde la URL

  try {
    // 1️⃣ Buscar el presupuesto asociado al proyecto y poblar info de los materiales
    const presupuesto = await PresupuestoMaterial.findOne({ proyecto: proyectoId })
      .populate({
        path: 'items.material',
        // Además del nombre, categoría y unidad, traemos el precio unitario y el stock actual.
        // Estos campos adicionales permiten que el frontend pueda mostrar el valor por defecto
        // del material en el formulario de presupuesto, así como el stock disponible.
        select: 'nombre categoria unidad precioUnitario cantidad',
      });

    // Si no existe, se notifica al cliente que no hay presupuesto
    if (!presupuesto) {
      return res.status(404).json({ message: 'Sin presupuesto para este proyecto' });
    }

    // 2️⃣ Calcular la suma del detalle sobre los ítems existentes
    const sumaDetalle = presupuesto.items.reduce(          // Se recorre el arreglo de ítems
      (sum, item) => sum + (item.cantidadPrevista * item.costoPrevisto), // Acumula cantidad * costo por cada ítem
      0,                                                   // Valor inicial del acumulador
    );

    // Se responde con el presupuesto completo + la suma de detalle calculada
    res.status(200).json({
      presupuesto,
      sumaDetalle,
    });
  } catch (error) {
    // Registro del error en consola del servidor
    console.error('Error en getPresupuesto:', error);

    // Respuesta genérica de error al cliente
    res.status(500).json({ message: 'Error al obtener el presupuesto' });
  }
};
