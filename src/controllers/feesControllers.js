const { logger } = require("../config/logger");
const FeesModel = require("../models/feesValues");
const FeesValuesBA = require("../models/feesValuesBA");
const FeesValuesCaba = require("../models/feesValuesCaba");

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

async function findUnnotifiedFees(Model, findOptions) {
  const firstDayOfMonth = moment.utc().startOf("month").toDate();
  try {

    const results = await Model.find({
      ...findOptions,
      vigencia: firstDayOfMonth,
    });
    return results;
  } catch (err) {
    logger.error("Error fetching unnotified fees:", err);
    throw err;
  }
}

async function findLatestFees(Model) {
  try {
    // Primero obtenemos el registro con la fecha más reciente
    const latestRecord = await Model.findOne({ notifiedByTelegram: false })
      .sort({ fecha: -1 })
      .exec();

    if (!latestRecord) {
      return []; // Si no hay registros, retornamos un array vacío
    }

    const latestDate = latestRecord.fecha;

    // Ahora obtenemos todos los registros con la misma fecha
    const results = await Model.find({ fecha: latestDate }).exec();

    return results;
  } catch (err) {
    logger.error("Error fetching latest fees:", err);
    throw err;
  }
}

async function saveNewFeesBA(elementsArray) {
  try {
    const bulkOperations = [];

    for (const element of elementsArray) {
      bulkOperations.push({
        updateOne: {
          filter: { vigencia: element.vigencia, type: element.type },
          update: { $setOnInsert: element },
          upsert: true, // Si no existe, inserta el documento
        },
      });
    }

    if (bulkOperations.length > 0) {
      const result = await FeesValuesBA.bulkWrite(bulkOperations);
      logger.info("Operaciones bulk completadas:", result);
    } else {
      logger.info("No hay operaciones para realizar.");
    }
  } catch (error) {
    logger.error("Error al realizar las operaciones bulk:", error);
  }
}

module.exports = {
  saveFeesValuesAfterLastVigencia,
  saveFeesValuesAfterLastVigenciaCaba,
  findUnnotifiedFees,
  findLatestFees,
  saveNewFeesBA,
};
