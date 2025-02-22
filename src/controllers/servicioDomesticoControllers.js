const ServicioDomestico = require("../models/laboral_servicioDomestico");
const { logWithDetails } = require("../config/logger");

async function agruparPorFechaYCategoria(datos) {
  const resultado = {};

  for (const item of datos) {
    const { fecha, categoria, tipo, valorHora, valorMensual } = item;
    const fechaStr = fecha;

    if (!resultado[fechaStr]) {
      resultado[fechaStr] = [];
    }

    // Buscar si ya existe la categoría
    let categoriaExistente = resultado[fechaStr].find(
      (cat) => cat.categoria === categoria
    );

    if (!categoriaExistente) {
      // Si no existe, agregar la nueva categoría
      categoriaExistente = { categoria, tipos: [] };
      resultado[fechaStr].push(categoriaExistente);
    }

    // Buscar si ya existe el tipo
    const tipoExistente = categoriaExistente.tipos.find((t) => t.tipo === tipo);

    if (tipoExistente) {
      // Sumar los valores si el tipo ya existe
      tipoExistente.valorHora += valorHora;
      tipoExistente.valorMensual += valorMensual;
    } else {
      // Agregar el nuevo tipo
      categoriaExistente.tipos.push({ tipo, valorHora, valorMensual });
    }
  }

  return resultado;
}

async function guardarDatosAgrupados(datosAgrupados) {
  const bulkOps = [];

  for (const [fechaStr, categorias] of Object.entries(datosAgrupados)) {
    const fechaObj = new Date(fechaStr);
    const update = {
      $set: {
        categorias: categorias.map((categoria) => ({
          categoria: categoria.categoria,
          tipos: categoria.tipos,
        })),
      },
    };

    bulkOps.push({
      updateOne: {
        filter: { fecha: fechaObj },
        update: update,
        upsert: true,
      },
    });
  }

  if (bulkOps.length > 0) {
    logWithDetails.info(
      "Datos agrupados guardados/actualizados en base de datos Servicio Doméstico"
    );
    return await ServicioDomestico.bulkWrite(bulkOps);
  }
}

const obtenerUltimaFecha = async () => {
  try {
    // Buscar el documento con la fecha más reciente
    const ultimoRegistro = await ServicioDomestico.findOne().sort({
      fecha: -1,
    });

    if (!ultimoRegistro) {
      return null;
    }

    return ultimoRegistro;
  } catch (error) {
    throw new Error(error);
  }
};

// Controlador para buscar los elementos por un array de IDs
const buscarPorIds = async (ids) => {
  try {
    // Validar que se envíe un array de IDs
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(`No se recibió un array válido`);
    }

    // Buscar los elementos en la base de datos utilizando los IDs
    const resultados = await ServicioDomestico.find({ _id: { $in: ids } });

    // Enviar la respuesta con los elementos encontrados
    return resultados;
  } catch (error) {
    logWithDetails.error(`Error al buscar por IDs: ${error}`);
    throw new Error(error);
  }
};

const findDocumentsToPostOrNotify = async (filterOptions = {}) => {
  try {
    // Construir dinámicamente la consulta según las propiedades que se pasen en filterOptions
    const query = {};

    if (filterOptions.postIG === false) query.postIG = false;
    if (filterOptions.notifiedByTelegram === false) query.notifiedByTelegram = false;
    if (filterOptions.notifiedByWhatsApp === false) query.notifiedByWhatsApp = false;

    // Ejecutar la consulta
    const results = await ServicioDomestico.find(query).sort({ fecha: 1 });;

    return results.length > 0 ? results : [];
  } catch (error) {
    logWithDetails.error(`Error al buscar documentos: ${error}`);
    throw new Error(error);
  }
};


async function updateNotifications(ids, notificationTypes) {
  try {
    // Validar que todos los objetos en notificationTypes tienen propiedades válidas
    const validTypes = ["notifiedByTelegram", "notifiedByWhatsApp", "postIG"];
    notificationTypes.forEach((obj) => {
      Object.keys(obj).forEach((key) => {
        if (!validTypes.includes(key)) {
          throw new Error(
            "Tipo de notificación inválido. Debe ser 'notifiedByTelegram', 'notifiedByWhatsApp' o 'postIG'."
          );
        }
      });
    });

    // Construir el objeto de actualización
    const updateFields = notificationTypes.reduce((acc, obj) => {
      return { ...acc, ...obj };
    }, {});


    // Actualizar los documentos con los IDs proporcionados
    const updatedDocuments = await ServicioDomestico.updateMany(
      { _id: { $in: ids } },
      { $set: updateFields },
      { new: true, multi: true }
    );

    // Obtener los documentos actualizados
    const result = await ServicioDomestico.find({ _id: { $in: ids } });
    return result;
  } catch (error) {
    logWithDetails.error("Error actualizando las notificaciones: ", error);
    throw error;
  }
}

module.exports = {
  agruparPorFechaYCategoria,
  guardarDatosAgrupados,
  obtenerUltimaFecha,
  buscarPorIds,
  findDocumentsToPostOrNotify,
  updateNotifications,
};
