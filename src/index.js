const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

const cron = require('node-cron');
const connectDB = require('./config/db');
const scrapeNoticias = require('./services/scraper');
const { enviarNoticias } = require('./services/bot');

// Conectar a MongoDB
connectDB();

// Configurar node-cron para ejecutar cada hora
cron.schedule('0 * * * *', async () => {
  console.log('Iniciando tarea programada: Scraping y envío de noticias');
  await scrapeNoticias();
  await enviarNoticias();
  console.log('Tarea completada');
});