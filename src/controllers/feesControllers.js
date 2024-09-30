const { logger } = require("../config/logger");
const FeesModel = require("../models/feesValues");
const FeesValuesCaba = require("../models/feesValuesCaba");
const moment = require("moment");

function generateTelegramMessage(results) {
  // Cabecera del mensaje
  let message = "Actualización valor UMA PJN Ley 27.423\n\n";

  // Iterar sobre cada uno de los resultados y formatear los valores
  results.forEach((result) => {
    const formattedVigencia = moment(result.vigencia).format("DD-MM-YYYY"); // Formatear fecha de vigencia
    const formattedMonto = `$ ${result.monto}`; // Formatear monto con dos decimales

    // Agregar al mensaje cada item
    message += `- Vigencia: ${formattedVigencia}, Monto: ${formattedMonto}\n`;
  });

  return message;
}

async function saveFeesValuesAfterLastVigencia(data) {
  try {
    // Buscar el último registro en la base de datos según la fecha de vigencia
    const lastRecord = await FeesModel.findOne().sort({ vigencia: -1 }).exec();
    let lastVigencia = lastRecord ? lastRecord.vigencia : null;

    // Filtrar los registros que tienen una vigencia posterior al último registro
    const newRecords = data.filter((row) => {
      return !lastVigencia || moment(row.vigencia).isAfter(lastVigencia);
    });

    if (newRecords.length > 0) {
      const bulkOps = newRecords.map((row) => {
        return {
          insertOne: {
            document: {
              resolucion: row.resolucion,
              fecha: row.fecha,
              monto: row.monto,
              periodo: row.periodo,
              vigencia: row.vigencia,
              organization: row.organization,
              type: row.type,
            },
          },
        };
      });

      // Realizar la operación en bloque para insertar los nuevos registros
      const result = await FeesModel.bulkWrite(bulkOps);
      logger.info(`Insertados: ${result.nInserted} nuevos registros.`);
    } else {
      logger.info("No hay nuevos registros para insertar.");
    }
  } catch (error) {
    logger.error("Error en la operación:", error);
  }
}

async function saveFeesValuesAfterLastVigenciaCaba(data) {
  try {
    // Buscar el último registro en la base de datos según la fecha de vigencia
    const lastRecord = await FeesValuesCaba.findOne()
      .sort({ vigencia: -1 })
      .exec();
    let lastVigencia = lastRecord ? lastRecord.vigencia : null;

    // Filtrar los registros que tienen una vigencia posterior al último registro
    const newRecords = data.filter((row) => {
      return !lastVigencia || moment(row.vigencia).isAfter(lastVigencia);
    });

    if (newRecords.length > 0) {
      const bulkOps = newRecords.map((row) => {
        return {
          insertOne: {
            document: {
              resolucion: row.resolucion,
              fecha: row.fecha,
              monto: row.monto,
              periodo: row.periodo,
              vigencia: row.vigencia,
              organization: row.organization,
              type: row.type,
            },
          },
        };
      });

      // Realizar la operación en bloque para insertar los nuevos registros
      const result = await FeesValuesCaba.bulkWrite(bulkOps);
      logger.info(`Insertados: ${result.nInserted} nuevos registros.`);
    } else {
      logger.info("No hay nuevos registros para insertar.");
    }
  } catch (error) {
    logger.error("Error en la operación:", error);
  }
}

async function findUnnotifiedFees(Model) {
  const today = moment().startOf("day").toDate(); // Obtiene la fecha de hoy a las 00:00:00
  try {
    const results = await Model.find({
      notifiedByTelegram: false,
      fecha: { $gte: today },
    });
    if (results.length > 0) {
      const message = generateTelegramMessage(results);
      return message
    }
    return results;
  } catch (err) {
    logger.error("Error fetching unnotified fees:", err);
    throw err;
  }
}

module.exports = {
  saveFeesValuesAfterLastVigencia,
  saveFeesValuesAfterLastVigenciaCaba,
  findUnnotifiedFees,
};
