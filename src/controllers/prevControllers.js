const { logger } = require("../config/logger");
const PrevLinks = require("../models/prevLinks");

async function savePrev(resultados) {
  const operacionesBulk = resultados.map((resultado) => {
    return {
      updateOne: {
        filter: { link: resultado.link },
        update: { $setOnInsert: resultado },
        upsert: true,
      },
    };
  });

  try {
    const result = await PrevLinks.bulkWrite(operacionesBulk);
    logger.info("Operaciones bulk ejecutadas:", result);
    return result;
  } catch (error) {
    logger.error(
      "Error al realizar las operaciones bulk en la base de datos:",
      error
    );
    throw new Error(error);
  }
}

module.exports = {
  savePrev,
};
