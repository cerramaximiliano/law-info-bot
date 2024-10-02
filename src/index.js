const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });
const express = require("express");
const app = express();
const PORT = process.env.PORT ? process.env.PORT : 3004;

const connectDB = require("./config/db");
const { startCronJobs } = require("./services/cronJobs");
const { logger } = require("./config/logger");
const { findUnnotifiedFees } = require("./controllers/feesControllers");
const FeesModel = require("./models/feesValues");
const FeesValuesCaba = require("./models/feesValuesCaba");
const { scrapeFeesData, scrapeFeesDataCABA } = require("./services/scraper");

// Iniciar tareas programadas
startCronJobs();

app.listen((PORT) => {
  logger.info("Aplicación iniciada correctamente");
  logger.info(`Escuchando puerto ${PORT}`);
  connectDB();
});
