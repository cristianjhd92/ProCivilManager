// File: BackEnd/src/modules/warehouses/controllers/almacen.controlador.js
// Description: Controlador para gestionar los almacenes de ProCivil Manager (PCM).
//              Expone operaciones CRUD básicas: crear, listar, obtener por ID,
//              actualizar y eliminar lógicamente almacenes. Se apoya en el modelo
//              Mongoose "Almacen" y se integra con las rutas montadas en
//              /api/almacenes. Incluye filtros por ciudad/departamento/activo
//              para soportar la selección de almacenes según la ubicación del
//              proyecto y solo considera almacenes no eliminados (isDeleted=false).

/* ==============================
 * Importación de dependencias
 * ============================== */

const Almacen = require('../models/almacen.modelo'); // Modelo Mongoose para la colección de almacenes
// Importamos el modelo Material para comprobar dependencias en la eliminación de almacenes
const Material = require('../../inventory/models/material.modelo');

/* ==============================
 * Crear nuevo almacén
 * ============================== */
// Crea un almacén a partir de los datos enviados en el cuerpo de la petición.
exports.createAlmacen = async (req, res) => {
  try {
    // Extraemos campos relevantes del body para tener control explícito
    const {
      nombre,
      ciudad,
      departamento,
      pais,
      direccion,
      telefono,
      correo,
      encargado,
      activo,
    } = req.body;

    // Validaciones mínimas: nombre y ciudad son obligatorios (el modelo también lo exige)
    if (!nombre || !ciudad) {
      return res.status(400).json({
        message: 'Los campos "nombre" y "ciudad" son obligatorios para crear un almacén.',
      });
    }

    // Creamos una nueva instancia de Almacen con los datos normalizados
    const nuevoAlmacen = new Almacen({
      nombre: nombre.trim(),
      ciudad: ciudad.trim(),
      departamento: departamento ? departamento.trim() : undefined,
      pais: pais ? pais.trim() : undefined, // si no viene, el modelo usa "Colombia" por defecto
      direccion: direccion ? direccion.trim() : undefined,
      telefono: telefono ? telefono.trim() : undefined,
      correo: correo ? correo.trim() : undefined,
      encargado: encargado ? encargado.trim() : undefined,
      activo: typeof activo === 'boolean' ? activo : true, // si no se envía, queda activo
      // isDeleted no se toca aquí, el modelo lo pone en false
    });

    // Guardamos el nuevo almacén en la base de datos
    await nuevoAlmacen.save();

    // Respondemos con 201 (creado) y devolvemos el almacén creado
    res.status(201).json({
      message: 'Almacén creado exitosamente',
      data: nuevoAlmacen,
    });
  } catch (error) {
    // Si el error es de validación de Mongoose, devolvemos 400 (bad request)
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Datos inválidos para crear el almacén',
        error: error.message,
      });
    }

    // Para otros errores, devolvemos 500 (error interno de servidor)
    console.error('Error al crear el almacén:', error);
    res.status(500).json({
      message: 'Error al crear el almacén',
      error: error.message,
    });
  }
};

/* ==============================
 * Obtener todos los almacenes
 * ============================== */
// Devuelve el listado de almacenes, con filtros opcionales por ciudad,
// departamento y activo. Siempre excluye registros eliminados lógicamente.
exports.getAlmacenes = async (req, res) => {
  try {
    // Posibles filtros enviados por query string:
    //  - ?ciudad=Bogotá
    //  - ?departamento=Cundinamarca
    //  - ?activo=true / false
    const { ciudad, departamento, activo } = req.query;

    // Filtro base: solo almacenes no eliminados
    const filter = {
      isDeleted: { $ne: true },
    };

    // Si viene ciudad, filtramos por ciudad (case insensitive con regex)
    if (ciudad) {
      filter.ciudad = { $regex: new RegExp(ciudad, 'i') };
    }

    // Si viene departamento, filtramos por departamento
    if (departamento) {
      filter.departamento = { $regex: new RegExp(departamento, 'i') };
    }

    // Si viene activo="true" o "false", lo convertimos a booleano
    if (activo === 'true') {
      filter.activo = true;
    } else if (activo === 'false') {
      filter.activo = false;
    }

    // Buscamos los almacenes aplicando los filtros
    const almacenes = await Almacen.find(filter).sort({ nombre: 1 });

    // Respondemos con 200 y el arreglo de almacenes filtrado
    res.status(200).json(almacenes);
  } catch (error) {
    // Logueamos el error en el servidor para diagnóstico
    console.error('Error al obtener los almacenes:', error);

    // Respondemos con 500 (error interno)
    res.status(500).json({
      message: 'Error al obtener los almacenes',
      error: error.message,
    });
  }
};

/* ==============================
 * Obtener un almacén por ID
 * ============================== */
// Busca un almacén específico a partir del parámetro de ruta :id.
// No devuelve almacenes marcados como eliminados (isDeleted=true).
exports.getAlmacenById = async (req, res) => {
  try {
    // Extraemos el id desde los parámetros de la ruta
    const { id } = req.params;

    // Buscamos el almacén por su ID y que no esté eliminado
    const almacen = await Almacen.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    // Si no se encuentra, devolvemos 404 (no encontrado)
    if (!almacen) {
      return res.status(404).json({ message: 'Almacén no encontrado' });
    }

    // Si existe, devolvemos 200 junto con el almacén
    res.status(200).json(almacen);
  } catch (error) {
    // Si el error es por ID mal formado (CastError), lo tratamos como 400
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'ID de almacén inválido',
        error: error.message,
      });
    }

    console.error('Error al obtener el almacén:', error);
    res.status(500).json({
      message: 'Error al obtener el almacén',
      error: error.message,
    });
  }
};

/* ==============================
 * Actualizar almacén
 * ============================== */
// Actualiza los campos de un almacén existente, identificado por :id.
// No permite "revivir" un almacén eliminado lógicamente por esta vía.
exports.updateAlmacen = async (req, res) => {
  try {
    // Extraemos el id desde los parámetros de la ruta
    const { id } = req.params;

    // Clonamos el body para poder limpiar campos que NO queremos que se actualicen
    const updateData = { ...req.body };

    // Por seguridad, evitamos que este endpoint modifique isDeleted directamente
    if (Object.prototype.hasOwnProperty.call(updateData, 'isDeleted')) {
      delete updateData.isDeleted;
    }

    // También podemos normalizar textos básicos si vienen
    if (updateData.nombre) updateData.nombre = updateData.nombre.trim();
    if (updateData.ciudad) updateData.ciudad = updateData.ciudad.trim();
    if (updateData.departamento) updateData.departamento = updateData.departamento.trim();
    if (updateData.pais) updateData.pais = updateData.pais.trim();
    if (updateData.direccion) updateData.direccion = updateData.direccion.trim();
    if (updateData.telefono) updateData.telefono = updateData.telefono.trim();
    if (updateData.correo) updateData.correo = updateData.correo.trim();
    if (updateData.encargado) updateData.encargado = updateData.encargado.trim();

    // findOneAndUpdate permite filtrar también por isDeleted: { $ne: true }
    const actualizado = await Almacen.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } }, // no actualizamos almacenes eliminados
      updateData,
      {
        new: true,           // Devuelve el documento ya actualizado
        runValidators: true, // Aplica validaciones del esquema
      }
    );

    // Si no se encontró el almacén, devolvemos 404
    if (!actualizado) {
      return res.status(404).json({ message: 'Almacén no encontrado' });
    }

    // Respondemos con el almacén actualizado
    res.status(200).json({
      message: 'Almacén actualizado correctamente',
      data: actualizado,
    });
  } catch (error) {
    // Si es un error de validación de Mongoose, devolvemos 400
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Datos inválidos para actualizar el almacén',
        error: error.message,
      });
    }

    // IDs mal formados (CastError) -> 400
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'ID de almacén inválido',
        error: error.message,
      });
    }

    console.error('Error al actualizar el almacén:', error);
    res.status(500).json({
      message: 'Error al actualizar el almacén',
      error: error.message,
    });
  }
};

/* ==============================
 * Eliminar almacén (lógico)
 * ============================== */
// Marca el almacén como eliminado (isDeleted=true) y lo desactiva (activo=false).
// No se borra físicamente el documento para conservar trazabilidad.
exports.deleteAlmacen = async (req, res) => {
  try {
    // Extraemos el id desde los parámetros de la ruta
    const { id } = req.params;

    // Buscamos el almacén que no esté ya eliminado
    const almacen = await Almacen.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    // Si no se encuentra, devolvemos 404
    if (!almacen) {
      return res.status(404).json({ message: 'Almacén no encontrado' });
    }

    // Antes de eliminar, verificamos si existen materiales asociados a este almacén
    try {
      // Contamos materiales que tienen referencia a este almacén y no están eliminados lógicamente
      const materialesAsociados = await Material.countDocuments({
        almacen: id,
        isDeleted: { $ne: true },
      });

      // Si hay materiales activos asociados, se bloquea la eliminación y se devuelve un mensaje descriptivo
      if (materialesAsociados > 0) {
        return res.status(400).json({
          message:
            'No se puede eliminar el almacén porque tiene materiales asociados. Retire o reasigne los materiales antes de eliminar.',
        });
      }

      // No hay materiales asociados, se procede con la eliminación lógica
      almacen.isDeleted = true;
      almacen.activo = false;

      // Guardamos los cambios
      await almacen.save();

      // Confirmamos la eliminación lógica
      return res.status(200).json({ message: 'Almacén eliminado correctamente' });
    } catch (err) {
      // Si ocurre un error al contar materiales asociados, se devuelve un error de servidor
      console.error('Error verificando materiales asociados al eliminar almacén:', err);
      return res.status(500).json({
        message: 'Error al intentar eliminar el almacén',
        error: err.message,
      });
    }
  } catch (error) {
    // IDs mal formados (CastError) -> 400
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'ID de almacén inválido',
        error: error.message,
      });
    }

    console.error('Error al eliminar el almacén:', error);
    res.status(500).json({
      message: 'Error al eliminar el almacén',
      error: error.message,
    });
  }
};
