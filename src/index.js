const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

const cron = require("node-cron");
const connectDB = require("./config/db");
const {
  scrapeNoticias,
  scrapeSaij,
  scrapeElDial,
  scrapeHammurabi,
  scrapeGPCourses,
} = require("./services/scraper");
const { bot } = require("./services/bot");
const {
  notifyUnnotifiedNews,
} = require("./controllers/telegramBotControllers");
const logger = require("./config/logger");

// Conectar a MongoDB
connectDB();

cron.schedule(
  "05 9-17 * * 1-5",
  async () => {
    try {
      logger.info("Tarea de envío de mensajes de bot iniciada");
      const unnotified = await notifyUnnotifiedNews();
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
      const unnotifiedActs = await notifyUnnotifiedNews("acts", 10, 2);
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
    const savedNews = await scrapeNoticias();
    const elDialNews = await scrapeElDial();
    const hammurabiNews = await scrapeHammurabi();
    logger.info("Tarea de web scraping finalizada");
  } catch (err) {
    logger.error("Error en tarea de web scraping:", err);
  }
});

cron.schedule(
  "0 8 * * 1-5",
  async () => {
    try {
      logger.info("Tarea de web scraping de normas");
      await scrapeSaij();
      logger.info("Tarea de web scraping de normas finalizada");
    } catch (err) {
      logger.err("Error en la tarea de web scarping Saij", err);
    }
  },
  {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires",
  }
);

/* (async () => {
  await scrapeGPCourses();
})();
 */
