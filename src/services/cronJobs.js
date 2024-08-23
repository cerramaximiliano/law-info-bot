const cron = require("node-cron");
const {
  scrapeNoticias,
  scrapeSaij,
  scrapeElDial,
  scrapeHammurabi,
  scrapeDiplomados,
  scrapeGPCourses,
} = require("./scraper");
const {
  notifyUnnotifiedNews,
} = require("../controllers/telegramBotControllers");
const logger = require("../config/logger");

const startCronJobs = () => {
  cron.schedule(
    "05 9-17 * * 1-5",
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

  cron.schedule(
    "00 9-17 * * 1-5",
    async () => {
      try {
        logger.info("Tarea de envío de mensajes de bot iniciada");
        await notifyUnnotifiedNews("acts", 10, 2);
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

  cron.schedule(
    "0 19 * * 5",
    async () => {
      try {
        logger.info("Tarea de scraping de diplomados y cursos iniciada");
        await scrapeDiplomados(); // Llama a la función de scraping
        await scrapeGPCourses();
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
};

module.exports = { startCronJobs };
