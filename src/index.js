const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

const connectDB = require("./config/db");
const { startCronJobs } = require("./services/cronJobs");
const { logger } = require("./config/logger");

// Conectar a MongoDB
connectDB();

// Iniciar tareas programadas
startCronJobs();

logger.info("Aplicación iniciada correctamente");

