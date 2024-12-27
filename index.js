const dotenv = require("dotenv");
const path = require("path");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });
const express = require("express");
const app = express();
const PORT = process.env.PORT ? process.env.PORT : 3004;
const routes = require("./src/routes");

const connectDB = require("./src/config/db");
const { startCronJobs } = require("./src/services/cronJobs");
const { logger } = require("./src/config/logger");

// Iniciar tareas programadas
startCronJobs();

app.listen(PORT, () => {
  logger.info("Aplicación iniciada correctamente");
  logger.info(`Escuchando puerto ${PORT}`);
  connectDB();
});

app.use(express.static(path.join(__dirname, "public")));
app.use(routes);

// Ruta para renderizar el archivo HTML de la landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
