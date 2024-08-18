const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

const cron = require("node-cron");
const connectDB = require("./config/db");
const scrapeNoticias = require("./services/scraper");
const { bot } = require("./services/bot");
const { notifyUnnotifiedNews } = require("./controllers/telegramBotControllers");
const logger = require("./config/logger");

// Conectar a MongoDB
connectDB();

// Configurar node-cron para ejecutar cada hora
cron.schedule("*/15 * * * *", async () => {
  const savedNews = await scrapeNoticias();  // Llama a la función para hacer scraping de noticias
  const unnotified = await notifyUnnotifiedNews();  // Llama a la función para notificar noticias no notificadas
  console.log("Tarea completada");
});
