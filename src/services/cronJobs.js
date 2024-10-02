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
} = require("./scraper");
const {
  notifyUnnotifiedNews,
  notifyUpcomingCourses,
  notifyUpcomingUBACourses,
} = require("../controllers/telegramBotControllers");
const { logger, clearLogs } = require("../config/logger");
const { findUnnotifiedFees } = require("../controllers/feesControllers");
const FeesModel = require("../models/feesValues");
const FeesValuesCaba = require("../models/feesValuesCaba");
const { generateTelegramMessage } = require("../utils/formatText");

const startCronJobs = async () => {
  const fees = await findUnnotifiedFees(FeesModel);
  console.log(fees);
  if (fees.length > 0) {
    const message = generateTelegramMessage(fees);
    console.log(message);
  }

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

  // Cron que hace scraping en valores Fees Nación
  cron.schedule(
    "10 8 * * 1-5",
    async () => {
      try {
        logger.info("Tarea de web scraping de normas iniciada");
        await scrapeFeesData();
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

  // Cron que hace scraping en valores Fees CABA
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
