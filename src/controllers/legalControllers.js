const { logger } = require("../config/logger");
const LegalLinks = require("../models/legalLinks");

async function saveLegalLinks(resultados) {
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
    const result = await LegalLinks.bulkWrite(operacionesBulk);
    logger.info(`Operaciones LEGAL links bulk ejecutadas: ${result.nInserted}`);
    return result;
  } catch (error) {
    logger.error(
      "Error al realizar las operaciones bulk en la base de datos LEGAL:",
      error
    );
    throw new Error(error);
  }
}

const findUnscrapedLegal = async (type) => {
  try {
    const results = await LegalLinks.find({ type, scraped: false }).sort({
      fecha: 1,
    });
    logger.info(
      `Se encontraron ${results.length} LEGAL links ${type} no scrapeados`
    );
    return results;
  } catch (error) {
    throw new Error(error);
  }
};

const findByIdAndUpdateScrapedAndData = async (id, newData) => {
  try {
    await LegalLinks.findByIdAndUpdate(id, {
      scraped: true,
      notifiedByTelegram: false,
      notifiedByWhatsApp: false,
      postIG: false,
      $push: { data: { $each: newData } },
    });
    logger.info(`Documento LEGAL con ID ${id} actualizado correctamente.`);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  saveLegalLinks,
  findUnscrapedLegal,
  findByIdAndUpdateScrapedAndData,
};
