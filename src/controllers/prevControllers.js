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

const findUnscrapedPrev = async () => {
  try {
    const results = await PrevLinks.find({ scraped: false }).sort({ fecha: 1 });
    logger.info(
      `Se encontraron ${results.length} links previsionales no scrapeados`
    );
    return results;
  } catch (error) {
    throw new Error(error);
  }
};

const findByIdAndUpdateScrapedAndData = async (id, newData) => {
  try {
    await PrevLinks.findByIdAndUpdate(id, {
      scraped: true,
      notifiedByTelegram: false,
      notifiedByWhatsApp: false,
      postIG: false,
      $push: { data: { $each: newData } },
    });
    console.log(`Documento con ID ${id} actualizado correctamente.`);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  savePrev,
  findUnscrapedPrev,
  findByIdAndUpdateScrapedAndData,
};
