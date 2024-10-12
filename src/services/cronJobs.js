const cron = require("node-cron");
const {
  scrapeNoticias,
  scrapeSaij,
  scrapeElDial,
  scrapeHammurabi,
  scrapeDiplomados,
  scrapeGPCourses,
  scrapeUBATalleres,
  scrapeUBAProgramas,
  scrapeFeesData,
  scrapeFeesDataCABA,
} = require("./scraper");
const {
  notifyUnnotifiedNews,
  notifyUpcomingCourses,
  notifyUpcomingUBACourses,
  notifyUnnotifiedFees,
} = require("../controllers/telegramBotControllers");
const { logger, clearLogs } = require("../config/logger");
const {
  findUnnotifiedFees,
  findLatestFees,
} = require("../controllers/feesControllers");
const FeesModel = require("../models/feesValues");
const FeesValuesCaba = require("../models/feesValuesCaba");
const { generateTelegramMessage } = require("../utils/formatText");
const { generateScreenshot } = require("../utils/generateImages");
const { newFeesPosts } = require("../posts/intagramPosts");

function getIdArray(objectsArray) {
  return objectsArray.map((obj) => obj._id);
}
function extractMontoAndPeriodo(dataArray) {
  return dataArray.map(({ monto, periodo }) => ({ monto: monto.toLocaleString("es-AR"), periodo }));
}

const startCronJobs = async () => {
  //const fees = await findUnnotifiedFees(FeesModel);
  const lastFees = await findLatestFees(FeesModel);
  const array = extractMontoAndPeriodo(lastFees);
  console.log(array);

  
  /* await generateScreenshot(
    newFeesPosts(array)
  ); */

  // Cron que envia mensajes Noticias a Telegram bot no notificados
  cron.schedule(
    "30 10 * * 1-5",
    async () => {
      try {
        logger.info("Tarea de envío de mensajes de bot iniciada");
        await notifyUnnotifiedNews();
        logger.info("Tarea de envío de mensajes de bot finalizada");
      } catch (err) {
        logger.error(`Error en tarea de envío de mensajes: ${err}`);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires",
    }
  );

  // Cron que envia mensajes Normativa con Telegram bot no notificados
  cron.schedule(
    "30 12 * * 1-5",
    async () => {
      try {
        logger.info("Tarea de envío de mensajes de bot iniciada");
        await notifyUnnotifiedNews("acts", 3, 40);
        logger.info("Tarea de envío de mensajes de bot finalizada");
      } catch (err) {
        logger.error(`Error en tarea de envío de mensajes: ${err}`);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires",
    }
  );

  // Cron que hace scraping en Noticias
  cron.schedule("*/15 * * * *", async () => {
    try {
      logger.info("Tarea de web scraping iniciada");
      await scrapeNoticias();
      await scrapeElDial();
      await scrapeHammurabi();
      logger.info("Tarea de web scraping finalizada");
    } catch (err) {
      logger.error("Error en tarea de web scraping:", err);
    }
  });

  // Cron que hace scraping en Normativa
  cron.schedule(
    "0 8 * * 1-5",
    async () => {
      try {
        logger.info("Tarea de web scraping de normas iniciada");
        await scrapeSaij();
        logger.info("Tarea de web scraping de normas finalizada");
      } catch (err) {
        logger.error("Error en la tarea de web scraping Saij:", err);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires",
    }
  );

  // Cron que hace scraping en valores Fees Nación y Fees CABA
  cron.schedule(
    "10 8 * * 1-5",
    async () => {
      try {
        logger.info("Tarea de web scraping de normas iniciada");
        await scrapeFeesData();
        await scrapeFeesDataCABA();
        logger.info("Tarea de web scraping de normas finalizada");
      } catch (err) {
        logger.error("Error en la tarea de web scraping Saij:", err);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires",
    }
  );

  // Cron que busca Cursos
  cron.schedule(
    "0 19 * * 5",
    async () => {
      try {
        logger.info("Tarea de scraping de diplomados y cursos iniciada");
        await scrapeDiplomados(); // Llama a la función de scraping
        await scrapeGPCourses();
        await scrapeUBATalleres();
        await scrapeUBAProgramas();
        logger.info("Tarea de scraping de diplomados y cursos finalizada");
      } catch (error) {
        logger.error(`Error en la tarea de scraping de diplomados: ${error}`);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires", // Configura la zona horaria de Argentina
    }
  );
  // Cron que notifica fees nuevos
  cron.schedule(
    "0 9 * * 1-5",
    async () => {
      try {
        logger.info(`Iniciada tarea de notificación de fees`);
        const fees = await findUnnotifiedFees(FeesModel);
        if (fees && fees.length > 0) {
          logger.info("Hay fees para notitificar");
          const message = generateTelegramMessage(
            "Actualización UMA PJN Ley 27.423",
            lastFees
          );
          const ids = getIdArray(lastFees);
          const notify = await notifyUnnotifiedFees(message, ids, "fees");
        }
        const feesCABA = await findUnnotifiedFees(FeesValuesCaba);
        if (feesCABA && feesCABA.length > 0) {
          logger.info("Hay feesCaba para notitificar");
          const message = generateTelegramMessage(
            "Actualización UMA CABA Ley 5.134",
            lastFees
          );
          const ids = getIdArray(lastFees);
          const notify = await notifyUnnotifiedFees(message, ids, "feesCaba");
        }
      } catch (err) {
        logger.error(`Error notificación de fees nuevos`);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires", // Configura la zona horaria de Argentina
    }
  );

  // Cron que notifica cursos los días 15 de cada mes
  cron.schedule(
    "0 9 15 * *",
    async () => {
      try {
        logger.info(
          "Tarea de notificación de cursos/diplomados programada para el día 15 de cada mes iniciada"
        );
        await notifyUpcomingCourses(); // Llama a la función que deseas ejecutar
        logger.info(
          "Tarea programada de cursos/diplomados para el día 15 de cada mes finalizada"
        );
      } catch (error) {
        logger.error(
          `Error en la tarea de notificación de cursos/diplomados programada para el día 15: ${error}`
        );
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires", // Configura la zona horaria de Argentina
    }
  );
  // Cron que notifica cursos los días 15 de cada mes
  cron.schedule(
    "0 9 16 * *",
    async () => {
      try {
        logger.info(
          "Tarea de notificación de cursos/diplomados programada para el día 15 de cada mes iniciada"
        );
        await notifyUpcomingUBACourses(); // Llama a la función que deseas ejecutar
        logger.info(
          "Tarea programada de cursos/diplomados para el día 15 de cada mes finalizada"
        );
      } catch (error) {
        logger.error(
          `Error en la tarea de notificación de cursos/diplomados programada para el día 15: ${error}`
        );
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires", // Configura la zona horaria de Argentina
    }
  );

  // Cron que limpia el archivo de Logs
  cron.schedule("0 0 */7 * *", () => {
    logger.log("Se ejecuta limpieza de logs");
    clearLogs();
  });
};

module.exports = { startCronJobs };
