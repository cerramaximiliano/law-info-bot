const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

const cron = require("node-cron");
const connectDB = require("./config/db");
const { scrapeNoticias, scrapeInfojus, scrapeElDial } = require("./services/scraper");
const { bot } = require("./services/bot");
const {
  notifyUnnotifiedNews,
} = require("./controllers/telegramBotControllers");
const logger = require("./config/logger");

// Conectar a MongoDB
connectDB();

// Configurar node-cron para ejecutar cada hora
cron.schedule("30 9 * * *", async () => {
  try {
    logger.info("Tarea de envío de mensajes de bot iniciada");
    const unnotified = await notifyUnnotifiedNews(); // Llama a la función para notificar noticias no notificadas
    console.log("Tarea de envío de mensajes de bot finalizada");
  } catch (err) {
    logger.error("Error en tarea de envío de mensajes");
  }
});

cron.schedule("*/15 * * * *", async () => {
  try {
    logger.info("Tarea de web scraping iniciada");
    const infoJusNews = await scrapeInfojus();
    const savedNews = await scrapeNoticias();
    logger.info("Tarea de web scraping finalizada");
  } catch (err) {
    logger.error("Error en tarea de web scraping");
  }
});


(async () => {

  await scrapeElDial()
  
})()