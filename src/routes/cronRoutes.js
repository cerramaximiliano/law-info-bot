const express = require("express");
const router = express.Router();
const {
  notifyUnnotifiedNews,
  notifyUpcomingCourses,
  notifyUpcomingUBACourses,
  notifyUnnotifiedFees,
} = require("../controllers/telegramBotControllers");
const { logger } = require("../config/logger");
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
  scrapeFeesDataBsAs,
} = require("../services/scraper");

// Ruta para ejecutar la notificación de noticias no notificadas
router.get("/notify-news", async (req, res) => {
  try {
    logger.info("Ejecutando tarea de notificación de noticias no notificadas");
    await notifyUnnotifiedNews();
    res.status(200).send("Notificación de noticias no notificadas completada");
  } catch (error) {
    logger.error("Error al notificar noticias no notificadas:", error);
    res.status(500).send("Error al notificar noticias no notificadas");
  }
});

// Ruta para ejecutar el scraping de noticias
router.get("/scrape-news", async (req, res) => {
  try {
    logger.info("Ejecutando tarea de scraping de noticias");
    await scrapeNoticias();
    await scrapeElDial();
    await scrapeHammurabi();
    res.status(200).send("Scraping de noticias completado");
  } catch (error) {
    logger.error("Error al realizar el scraping de noticias:", error);
    res.status(500).send("Error al realizar el scraping de noticias");
  }
});

// Ruta para ejecutar el scraping de normativa
router.get("/scrape-acts", async (req, res) => {
  try {
    logger.info("Ejecutando tarea de scraping de normativa");
    await scrapeSaij();
    res.status(200).send("Scraping de normativa completado");
  } catch (error) {
    logger.error("Error al realizar el scraping de normativa:", error);
    res.status(500).send("Error al realizar el scraping de normativa");
  }
});

// Ruta para ejecutar el scraping de fees
router.get("/scrape-fees", async (req, res) => {
  try {
    logger.info("Ejecutando tarea de scraping de fees");
    await scrapeFeesData();
    await scrapeFeesDataCABA();
    await scrapeFeesDataBsAs();
    res.status(200).send("Scraping de fees completado");
  } catch (error) {
    logger.error("Error al realizar el scraping de fees:", error);
    res.status(500).send("Error al realizar el scraping de fees");
  }
});

// Ruta para ejecutar la notificación de cursos
router.get("/notify-courses", async (req, res) => {
  try {
    logger.info("Ejecutando tarea de notificación de cursos");
    await notifyUpcomingCourses();
    res.status(200).send("Notificación de cursos completada");
  } catch (error) {
    logger.error("Error al notificar cursos:", error);
    res.status(500).send("Error al notificar cursos");
  }
});

// Ruta para ejecutar la notificación de cursos UBA
router.get("/notify-uba-courses", async (req, res) => {
  try {
    logger.info("Ejecutando tarea de notificación de cursos UBA");
    await notifyUpcomingUBACourses();
    res.status(200).send("Notificación de cursos UBA completada");
  } catch (error) {
    logger.error("Error al notificar cursos UBA:", error);
    res.status(500).send("Error al notificar cursos UBA");
  }
});

module.exports = router;
