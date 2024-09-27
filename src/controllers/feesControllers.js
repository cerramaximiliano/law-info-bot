const { logger } = require("../config/logger");
const FeesModel = require("../models/feesValues");
const moment = require("moment");

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

module.exports = { saveFeesValuesAfterLastVigencia };