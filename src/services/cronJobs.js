const cron = require("node-cron");
const axios = require("axios");

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
  scrapeLegalPage,
  scrapePrevisionalLink,
} = require("./scraper");
const {
  notifyUnnotifiedNews,
  notifyUpcomingCourses,
  notifyUpcomingUBACourses,
  notifyUnnotifiedFees,
} = require("../controllers/telegramBotControllers");
const { logger, clearLogs } = require("../config/logger");
const {
  findUnnotifiedFees,
  findLatestFees,
} = require("../controllers/feesControllers");
const FeesModel = require("../models/feesValues");
const FeesValuesCaba = require("../models/feesValuesCaba");
const {
  generateTelegramMessage,
  extractMontoAndPeriodo,
  getIdArray,
} = require("../utils/formatText");
const { generateScreenshot } = require("../utils/generateImages");
const { newFeesPosts, prevPost } = require("../posts/intagramPosts");
const {
  uploadMedia,
  uploadCarouselMedia,
} = require("../controllers/igControllers");
const { uploadImage, deleteImage } = require("./cloudinaryService");
const {
  saveLegalLinks,
  findUnscrapedLegal,
  findByIdAndUpdateScrapedAndData,
} = require("../controllers/legalControllers");
const { cleanDirectory } = require("../utils/manageFiles");
const { extractData, iterateTextByLine } = require("../utils/readFile");
const { askQuestion } = require("./chatgpt");
const moment = require("moment");
const { text } = require("../files/legales/text");

const cronSchedules = {
  notifyNews: "30 10 * * 1-5",
  notifyNewsHours: "30 12 * * 1-5",
  scrapingNoticias: "*/15 8-18 * * 1-5",
  scrapingActs: "0 8 * * 1-5",
  scrapingFees: "10 8 * * 1-5",
  scrapingLegal: "15 8 * * 1-5",
  notifyPrev: "15 9 * * 1-5",
  scrapingCourses: "0 19 * * 5",
  feesNotificationHours: "0 9 * * 1-5",
  notifyCoursesHours: "0 9 15 * *",
  notifyNewCoursesHours: "0 9 16 * *",
  cleanLogsHours: "0 0 15,30 * *",
};

const startCronJobs = async () => {
  // Cron que hace scraping sobre datos previsionales
  cron.schedule(
    cronSchedules.scrapingLegal,
    async () => {
      logger.info("Tarea de scraping de leyes iniciado");
      try {
        let resultPrevisional = await scrapeLegalPage(
          process.env.PREV_PAGE_1,
          "ADMINISTRACION NACIONAL DE LA SEGURIDAD SOCIAL",
          [
            "HABERES MINIMO Y MAXIMO",
            "BASES IMPONIBLES",
            "PRESTACION BASICA UNIVERSAL",
            "PENSION UNIVERSAL",
            "HABERES",
            "HABER MINIMO",
          ],
          "previsional- aumentos"
        );
        let savePrevisionalData = await saveLegalLinks(resultPrevisional);

        let resultLaboralDomestico = await scrapeLegalPage(
          process.env.LABORAL_PAGE_1,
          ["COMISION NACIONAL DE TRABAJO EN CASAS PARTICULARES"],
          ["REMUNERACIONES", "INCREMENTO"],
          "laboral- servicio doméstico"
        );

        let saveLaboralDomesticoData = await saveLegalLinks(
          resultLaboralDomestico
        );
      } catch (error) {
        logger.error(`Error al realizar tarea de scraping de leyes: ${error}`);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires",
    }
  );
  // Cron que notifica datos previsionales por IG
  cron.schedule(
    cronSchedules.notifyPrev,
    async () => {
      try {
        let results = await findUnscrapedLegal("previsional- aumentos");
        if (results.length > 0) {
          const resultsData = await scrapePrevisionalLink(results[0].link);
          logger.info(
            `Tarea de scraping de link previsional. ID: ${results[0]._id}`
          );
          await findByIdAndUpdateScrapedAndData(results[0]._id, resultsData);
          if (resultsData && resultsData.length > 0) {
            let imageIds = [];
            let imageUrls = [];

            for (const [index, element] of resultsData.entries()) {
              const htmlCode = prevPost(element);
              try {
                const generatedFile = await generateScreenshot(htmlCode);
                const image = await uploadImage(`./src/files/${generatedFile}`);
                const imageId = image.public_id;

                imageIds.push(imageId);
                imageUrls.push(image.secure_url);
              } catch (error) {
                logger.error(
                  `Error procesando el elemento en el índice ${index}:`,
                  error
                );
              }
            }
            if (imageIds.length > 0 && imageUrls.length > 0) {
            }
            const caption =
              "Actualización previsional ANSES\n #ANSES #Ley24241 #jubilaciones #pensiones #pbu #puam\n\n";
            await uploadCarouselMedia(imageUrls, caption);
          }
        }
      } catch (error) {
        logger.error(
          `Error al realizar tarea de notificación previsional: ${error}`
        );
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires",
    }
  );

  // Cron que envia mensajes Noticias a Telegram bot no notificados
  cron.schedule(
    cronSchedules.notifyNews,
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
    cronSchedules.notifyNewsHours,
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
  cron.schedule(cronSchedules.scrapingNoticias, async () => {
    try {
      logger.info("Tarea de web scraping de noticias iniciada");
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
    cronSchedules.scrapingActs,
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

  // Cron que hace scraping en valores Fees Nación y Fees CABA
  cron.schedule(
    cronSchedules.scrapingFees,
    async () => {
      try {
        logger.info("Tarea de web scraping de fees iniciada");
        await scrapeFeesData();
        await scrapeFeesDataCABA();
        await scrapeFeesDataBsAs();
        logger.info("Tarea de web scraping de fees finalizada");
      } catch (err) {
        logger.error("Error en la tarea de web scraping fees:", err);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires",
    }
  );

  // Cron que busca Cursos
  cron.schedule(
    cronSchedules.scrapingCourses,
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

  // Cron que notifica fees nuevos en Telegram y envía IG posts
  cron.schedule(
    cronSchedules.feesNotificationHours,
    async () => {
      try {
        logger.info(`Iniciada tarea de notificación de fees`);
        // Notificar fees Nación
        const fees = await findUnnotifiedFees(FeesModel);
        if (fees && fees.length > 0) {
          logger.info("Hay fees para notitificar");
          const message = generateTelegramMessage(
            "Actualización UMA PJN Ley 27.423",
            fees
          );
          const array = extractMontoAndPeriodo(fees);
          const htmlCode = newFeesPosts(array, "2", ["UMA", "Ley Nº 27.423 "]);
          const generatedFile = await generateScreenshot(htmlCode);
          const image = await uploadImage(`./src/files/${generatedFile}`);
          const imageId = image.public_id;
          const caption =
            "Nuevos valores UMA Ley Nº 27.423 \n#UMA #PoderJudicial #Aranceles #Honorarios\n\n";
          const mediaId = await uploadMedia(image.secure_url, caption);
          await deleteImage(imageId);
          const ids = getIdArray(fees);
          const notify = await notifyUnnotifiedFees(message, ids, "fees");
        }
        // Notificar fees CABA
        const feesCABA = await findUnnotifiedFees(FeesValuesCaba);
        if (feesCABA && feesCABA.length > 0) {
          logger.info("Hay feesCaba para notitificar");
          const message = generateTelegramMessage(
            "Actualización UMA CABA Ley 5.134",
            feesCABA
          );
          const array = extractMontoAndPeriodo(feesCABA);
          const htmlCode = newFeesPosts(array, "2", ["UMA CABA", "Ley 5.134"]);
          const generatedFile = await generateScreenshot(htmlCode);
          const image = await uploadImage(`./src/files/${generatedFile}`);
          const imageId = image.public_id;
          const caption =
            "Nuevos valores UMA CABA Ley Nº 5.134 \n#UMA #PoderJudicialCABA #Aranceles #Honorarios\n\n";
          const mediaId = await uploadMedia(image.secure_url, caption);
          await deleteImage(imageId);
          const ids = getIdArray(lastFees);
          const notify = await notifyUnnotifiedFees(message, ids, "feesCaba");
        }
      } catch (err) {
        logger.error(`Error notificación de fees nuevos`);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires", // Configura la zona horaria de Argentina
    }
  );

  // Cron que notifica cursos los días 15 de cada mes
  cron.schedule(
    cronSchedules.notifyCoursesHours,
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
  // Cron que notifica cursos los días 15 de cada mes
  cron.schedule(
    cronSchedules.notifyNewCoursesHours,
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
  cron.schedule(cronSchedules.cleanLogsHours, () => {
    logger.log("Se ejecuta limpieza de logs");
    clearLogs();
    cleanDirectory("./src/files");
  });
};

module.exports = { startCronJobs };
