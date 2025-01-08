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
  scrapeDomesticos,
} = require("./scraper");
const {
  notifyUnnotifiedNews,
  notifyUpcomingCourses,
  notifyUpcomingUBACourses,
  notifyUnnotifiedFees,
  notifyUnnotifiedLaboral,
} = require("../controllers/telegramBotControllers");
const { logWithDetails, clearLogs } = require("../config/logger");
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
  formatLogReportEmail,
} = require("../utils/formatText");
const { renderTables, example } = require("../utils/formatHTML");
const { generateTelegramMessageDomesticos } = require("../utils/formatText");
const { generateScreenshot } = require("../utils/generateImages");
const {
  newFeesPosts,
  prevPost,
  firstLaboralPost,
  secondLaboralTablePost,
} = require("../posts/instagramPosts");
const {
  uploadMedia,
  uploadCarouselMedia,
  checkTokenExpiration,
} = require("../controllers/igControllers");
const {
  uploadImage,
  deleteImage,
  getLinksFromFolders,
} = require("./cloudinaryService");
const {
  saveLegalLinks,
  findUnscrapedLegal,
  findByIdAndUpdateScrapedAndData,
} = require("../controllers/legalControllers");
const { cleanDirectory, cleanupLocalFile } = require("../utils/manageFiles");
const { extractData, iterateTextByLine } = require("../utils/readFile");
const { askQuestion } = require("./chatgpt");
const moment = require("moment");
const { text } = require("../files/legales/text");
const {
  agruparPorFechaYCategoria,
  guardarDatosAgrupados,
  obtenerUltimaFecha,
  buscarPorIds,
  findDocumentsToPostOrNotify,
  updateNotifications,
} = require("../controllers/servicioDomesticoControllers");
const util = require("util");
const LogAnalyzer = require("./logAnalyzer");
const { sendEmailController } = require("../controllers/emailControllers");
const accessToken = process.env.IG_API_TOKEN;

const cronSchedules = {
  notifyNews: "30 10 * * 1-5",
  notifyNewsHours: "30 12 * * 1-5",
  scrapingNoticias: "*/15 8-18 * * 1-5",
  scrapingActs: "0 8 * * 1-5",
  scrapingFees: "10 8 * * 1-5",
  scrapingLegal: "15 8 * * 1-5",

  scrapingLaboral: "20 8 * * 1-5",
  notifyLaboralDomestico: "0 10 * * 1-5 ",
  notifyLaboralDomesticoTelegram: "20 13 * * 1-5",

  notifyPrev: "10 10 * * 1-5",
  scrapingCourses: "0 19 * * 5",
  feesNotificationHours: "46 16 * * 1-5",
  notifyCoursesHours: "0 9 15 * *",
  notifyNewCoursesHours: "0 9 16 * *",
  cleanLogsHours: "0 0 15,30 * *",
  loggerReportHours: "59 23 * * 1-5",

  efemerides: [
    {
      cron: "30 10 0 1 1 *",
      nombre: "Año Nuevo",
      descripcion:
        "🎉 Celebramos el inicio de un nuevo año lleno de esperanza y oportunidades. 🌟",
      hashtags: "#AñoNuevo #Felicidades #Esperanza",
      key: "ano_nuevo",
    },
    {
      cron: "30 10 25 5 *",
      nombre: "Día de la Revolución de Mayo",
      descripcion:
        "🇦🇷 Conmemoramos el inicio del camino hacia la independencia en 1810. ✊",
      hashtags: "#RevoluciónDeMayo #Argentina",
      key: "revolucion_mayo",
    },
    {
      cron: "30 10 9 7 *",
      nombre: "Día de la Independencia",
      descripcion:
        "🎆 Celebramos nuestra libertad y la declaración de independencia en 1816. 🕊️",
      hashtags: "#IndependenciaArgentina #9DeJulio",
      key: "independencia",
    },
    {
      cron: "30 10 20 11 *",
      nombre: "Día de la Soberanía Nacional",
      descripcion:
        "⚓ Homenajeamos a los héroes que defendieron nuestra soberanía en 1845. 🌊",
      hashtags: "#SoberaníaNacional #Argentina",
      key: "soberania",
    },
    {
      cron: "30 10 2 4 *",
      nombre: "Día del Veterano y de los Caídos en la Guerra de Malvinas",
      descripcion:
        "🎖️ Honramos a quienes dieron todo por nuestra patria en 1982. 🇦🇷",
      hashtags: "#MalvinasArgentinas #2DeAbril",
      key: "malvinas",
    },
    {
      cron: "30 10 20 6 *",
      nombre: "Día de la Bandera",
      descripcion:
        "🎌 Celebramos nuestra enseña patria y recordamos a Manuel Belgrano. 💙",
      hashtags: "#DíaDeLaBandera #ManuelBelgrano",
      key: "bandera",
    },
    {
      cron: "30 10 2 10 *",
      nombre: "Día del Notariado",
      descripcion:
        "✍️ Agradecemos a quienes garantizan seguridad jurídica en cada acto. ⚖️",
      hashtags: "#Notariado #SeguridadJurídica",
      key: "notariado",
    },
    {
      cron: "30 10 1 5 *",
      nombre: "Día de la Constitución Nacional",
      descripcion:
        "📜 Celebramos los principios que rigen nuestra nación y garantizan los derechos de todos. 🇦🇷",
      hashtags: "#ConstituciónNacional #DerechoConstitucional",
      key: "constitucion",
    },
    {
      cron: "30 10 5 9 *",
      nombre: "Día de la Mediación",
      descripcion:
        "🤝 Reconocemos la importancia del diálogo para resolver conflictos de manera justa y pacífica. 🕊️",
      hashtags: "#Mediación #ResoluciónDeConflictos",
      key: "mediacion",
    },
    {
      cron: "30 10 18 7 *",
      nombre: "Día del Procurador",
      descripcion:
        "📜 Homenajeamos a quienes representan y defienden los intereses del bien común. ⚖️",
      hashtags: "#DíaDelProcurador #Derecho",
      key: "procurador",
    },
    {
      cron: "30 10 15 3 *",
      nombre: "Día Mundial del Derecho de los Consumidores",
      descripcion:
        "🛍️ Fomentamos el respeto y la protección de los derechos de los consumidores en todo el mundo. 🌐",
      hashtags: "#DerechosDelConsumidor #ProtecciónAlConsumidor",
      key: "consumidores",
    },
    {
      cron: "30 10 9 12 *",
      nombre: "Día Internacional contra la Corrupción",
      descripcion:
        "🚨 Nos comprometemos a luchar contra la corrupción y garantizar la integridad en la justicia. ✨",
      hashtags: "#NoALaCorrupción #JusticiaTransparente",
      key: "corrupcion",
    },
    {
      cron: "30 10 25 11 *",
      nombre:
        "Día Internacional de la Eliminación de la Violencia contra la Mujer",
      descripcion:
        "🛑 Decimos NO a la violencia contra las mujeres y promovemos la igualdad y la justicia. ✊",
      hashtags: "#ViolenciaDeGeneroNo #JusticiaParaTodas #Igualdad",
      key: "violencia_mujer",
    },
    {
      cron: "30 10 17 7 *",
      nombre: "Día Internacional de la Justicia Penal",
      descripcion:
        "⚖️ Reafirmamos el compromiso global con la justicia y el fin de la impunidad. 🌍",
      hashtags: "#JusticiaPenal #CortePenalInternacional #Derecho",
      key: "justicia_penal",
    },
    {
      cron: "30 10 16 5 *",
      nombre: "Día Mundial del Acceso a la Justicia",
      descripcion:
        "🔑 Impulsamos el acceso a la justicia como un derecho esencial para todos. 🌎",
      hashtags: "#AccesoALaJusticia #DerechosHumanos",
      key: "acceso_justicia",
    },
    {
      cron: "30 10 5 6 *",
      nombre: "Día del Derecho Ambiental",
      descripcion:
        "🌱 Promovemos el derecho a un ambiente sano y el compromiso con la sostenibilidad. 🌍",
      hashtags: "#DerechoAmbiental #JusticiaVerde",
      key: "derecho_ambiental",
    },
    {
      cron: "30 10 12 6 *",
      nombre: "Día Nacional contra el Trabajo Infantil",
      descripcion:
        "🚸 Decimos no al trabajo infantil y sí a la educación y la niñez plena. 📚",
      hashtags: "#TrabajoInfantilNo #DerechosDeLosNiños",
      key: "trabajo_infantil",
    },
    {
      cron: "30 10 29 8 *",
      nombre: "Día del Abogado",
      descripcion:
        "⚖️ Celebramos a quienes trabajan incansablemente por la justicia y el derecho. 📜",
      hashtags: "#DiaDelAbogado #Derecho",
      key: "abogado",
    },
    {
      cron: "30 10 23 9 *",
      nombre: "Día Contra la Explotación Sexual y Trata de Personas",
      descripcion:
        "🚫 Decimos basta a estas prácticas y buscamos justicia para las víctimas. ✊",
      hashtags: "#TrataDePersonasNo #Justicia",
      key: "trata",
    },
    {
      cron: "30 10 8 3 *",
      nombre: "Día Internacional de la Mujer",
      descripcion:
        "🌸 Celebramos los derechos y logros de las mujeres en todo el mundo. 💪",
      hashtags: "#DiaDeLaMujer #IgualdadDeGénero",
      key: "mujer",
    },
    {
      cron: "30 10 10 12 *",
      nombre: "Día de los Derechos Humanos",
      descripcion:
        "🕊️ Reflexionamos sobre la importancia de defender la dignidad de todas las personas. 🌍",
      hashtags: "#DerechosHumanos #Igualdad #Justicia",
      key: "humanos",
    },
    {
      cron: "30 10 1 2 *",
      nombre: "Día del Abogado Laboralista",
      descripcion:
        "💼 Reconocemos a quienes trabajan para proteger los derechos laborales. ✊",
      hashtags: "#AbogadoLaboralista #DerechoLaboral",
      key: "laboralista",
    },
    {
      cron: "30 10 10 10 *",
      nombre: "Día de la Abogacía del Niño",
      descripcion:
        "👦👧 Promovemos la defensa de los derechos de la niñez y la adolescencia para un futuro lleno de justicia y equidad. ⚖️✨",
      hashtags: "#AbogaciaDelNiño #DerechosDeLaNiñez",
      key: "abogado_infancias",
    },
    {
      cron: "30 10 3 12 *",
      nombre: "Día del Médico y del Derecho a la Salud",
      descripcion:
        "🩺🌍 Reafirmamos el acceso universal a la salud como un derecho fundamental para todas las personas. 💪❤️",
      hashtags: "#DerechoALaSalud #SaludParaTodos",
      key: "derecho_salud",
    },
    {
      cron: "30 10 22 3 *",
      nombre: "Día Mundial del Agua",
      descripcion:
        "💧🌊 Defendemos el acceso al agua potable como un derecho humano esencial para la vida. 🌿✨",
      hashtags: "#DerechoAlAgua #AguaParaTodos",
      key: "derecho_agua",
    },
    {
      cron: "30 10 28 4 *",
      nombre: "Día Mundial de la Seguridad y Salud en el Trabajo",
      descripcion:
        "🏢🦺 Fomentamos espacios laborales seguros, saludables y dignos para todos. 💼✨",
      hashtags: "#SeguridadLaboral #DerechosLaborales",
      key: "seguridad_trabajo",
    },
    {
      cron: "30 10 16 11 *",
      nombre: "Día Internacional para la Tolerancia",
      descripcion:
        "🌍🤝 Celebramos la diversidad y promovemos la convivencia pacífica entre culturas para un mundo más unido. ❤️✨",
      hashtags: "#Tolerancia #Igualdad #DerechosHumanos",
      key: "tolerancia",
    },
  ],
};
const REGION_HOURS = {
  scheduled: true,
  timezone: "America/Argentina/Buenos_Aires",
};

const admin = process.env.ADMIN_EMAIL;

// Función genérica para ejecutar una tarea
async function executeEfemerideTask(key, descripcion) {
  try {
    const checkToken = await checkTokenExpiration(accessToken);

    if (checkToken.daysUntilExpiration === 0) {
      logWithDetails.log(`Token expirado. No se ejecuta la tarea para: ${key}`);
      return;
    }

    const year = moment().year();
    const folderPath = [`posts/efemerides/${year}/${key}`];
    const results = await getLinksFromFolders(folderPath);
    const link = results.resources[0]?.url;

    if (link) {
      logWithDetails.info(`Ejecutando efeméride para ${key}: ${link}`);
      const result = await uploadMedia(link, descripcion);
      logWithDetails.info(`Tarea completada para ${key}:`, result);
    } else {
      logWithDetails.info(`No se encontró link para ${key}`);
    }
  } catch (error) {
    logWithDetails.error(`Error en la tarea para ${key}: ${error}`);
  }
}

// Registrar los cron jobs dinámicamente
function registerEfemerides(cronSchedules) {
  cronSchedules.efemerides.forEach(({ cron, key, descripcion }) => {
    cron.schedule(cron, async () => {
      logWithDetails.info(`Iniciando tarea programada para: ${key}`);
      await executeEfemerideTask(key, descripcion);
    });
  });

  logWithDetails.info(
    `${cronSchedules.efemerides.length} efemérides programadas.`
  );
}

// Ejecutar la función de registro
//registerEfemerides(cronSchedules);

const startCronJobs = async () => {

  // Reporte diario de logs
  cron.schedule(
    cronSchedules.loggerReportHours,
    async () => {
      try {
        const analyzer = new LogAnalyzer("src/logs/app.log");
        const report = await analyzer.generateReport(new Date());
        const textReport = formatLogReportEmail(report);
        sendEmailController(
          admin,
          textReport,
          `[LOG REPORT] LAW BOT ${moment().format("DD-MM-YYYY")}`
        );
      } catch (error) {
        logWithDetails.error(`Error logger report: ${error}`);
      }
    },
    REGION_HOURS
  );

  // cron que notifica en Telegram datos laborales - servicio doméstico
  cron.schedule(
    cronSchedules.notifyLaboralDomesticoTelegram,
    async () => {
      try {
        logWithDetails.info(
          `cron que notifica datos laborales - servicio doméstico`
        );
        const found = await findDocumentsToPostOrNotify({
          notifiedByTelegram: false,
        });
        if (found.length > 0) {
          logWithDetails.info(
            `Hay documentos para notificar datos laborales - servicio doméstico`
          );

          for (let index = 0; index < found.length; index++) {
            console.log(found[index]._id);
            const message = generateTelegramMessageDomesticos(found[index]);
            const messageId = await notifyUnnotifiedLaboral(message);
            if (messageId) {
              logWithDetails.info(
                `Mensaje laboral - servicio doméstico enviado con éxito. ID del mensaje: ${messageId}`
              );
              if (process.env.NODE_ENV === "production") {
                await updateNotifications(found[index]._id, [
                  { notifiedByTelegram: true },
                ]);
              }
            }
          }
        } else {
          logWithDetails.error(
            `No hay documentos para notificar datos laborales - servicio doméstico`
          );
        }
      } catch (error) {
        logWithDetails.error(
          `Error al notificar datos laborales - servicio doméstico: ${error}`
        );
      }
    },
    REGION_HOURS
  );

  // cron que notifica post de IG de datos laborales - servicios doméstico
  cron.schedule(
    cronSchedules.notifyLaboralDomestico,
    async () => {
      try {
        const found = await findDocumentsToPostOrNotify({ postIG: false });
        if (found && found.length > 0) {
          const ids = found.map((element) => {
            return element._id;
          });

          logWithDetails.info(
            `Hay documentos laboral - servicio doméstico para notificar post IG`
          );
          const tables = renderTables(found);

          let imageIds = [];
          let imageUrls = [];

          let generatedFile;
          try {
            generatedFile = await generateScreenshot(
              firstLaboralPost(
                {
                  subtitle: "Ley 26.844",
                  title: "Personal Casas Particulares",
                },
                "https://res.cloudinary.com/dqyoeolib/image/upload/v1730293801/ltxyz27xjk9cl3a3gljo.webp"
              )
            );
            const image = await uploadImage(`./src/files/${generatedFile}`);
            if (image && image.secure_url) {
              imageUrls.push(image.secure_url);
              imageIds.push(image.public_id);
            }
          } catch (error) {
            logWithDetails.error(
              `Error generando/subiendo la primera imagen laboral - sevicio doméstico: ${error}`
            );
            return;
          }
          if (tables.length > 0) {
            for (let index = 0; index < tables.length; index++) {
              try {
                const htmlCode = secondLaboralTablePost(
                  tables[index],
                  "https://res.cloudinary.com/dqyoeolib/image/upload/v1730293801/ltxyz27xjk9cl3a3gljo.webp"
                );
                generatedFile = await generateScreenshot(htmlCode);
                const image = await uploadImage(`./src/files/${generatedFile}`);
                if (image && image.secure_url) {
                  imageUrls.push(image.secure_url);
                  imageIds.push(image.public_id);
                }
              } catch (error) {
                logWithDetails.error(
                  `Error generando o subiendo imagen de la tabla: ${error.message}`
                );
              }
            }
          }

          if (imageUrls.length > 1) {
            try {
              const caption =
                "Actualización laboral Ley 26.844 Personal de Casas Particulares\n #serviciodomestico #Ley26844 #aumentos #laboral #remuneraciones #actualizlaciones\n\n";
              await uploadCarouselMedia(imageUrls, caption);
              await updateNotifications(ids, [{ postIG: true }]);
              await deleteImage(imageIds);
            } catch (error) {
              logWithDetails.error(
                `Error al subir carrusel o actualizar notificaciones: ${error.message}`
              );
            }
          }
        } else {
          logWithDetails.info(
            `No hay documentos para notificar laboral - servicio doméstico`
          );
        }
      } catch (error) {
        logWithDetails.error(
          `Error en notificación laboral - servicio doméstico posts IG`
        );
      }
    },
    REGION_HOURS
  );

  // cron que hace scraping sobre datos laborales - servicios doméstico
  cron.schedule(
    cronSchedules.notifyLaboralDomestico,
    async () => {
      try {
        // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> TODO
        // ELIMINAR EL SCRAPING Y SOLO BUSCAR LOS ELEMENTOS NUEVOS Y NO NOTIFICADOS
        logWithDetails.info(`Tarea de scraping de servicio doméstico iniciado`);
        const lastData = await obtenerUltimaFecha();
        const resultsDomesticos = await scrapeDomesticos(
          process.env.LABORAL_PAGE_2,
          lastData.fecha
        );
        if (resultsDomesticos && resultsDomesticos.length > 0) {
          const resultsGrouped = await agruparPorFechaYCategoria(
            resultsDomesticos
          );
          const save = await guardarDatosAgrupados(resultsGrouped);
          logWithDetails.info(
            `Documentos laboral servicio domestico: Guardados insertos ${save.result.nUpserted} , encontrados ${save.result.nMatched}, modificados ${save.result.nModified}`
          );
        }
      } catch (error) {
        logWithDetails.error(
          `Error en la tarea de servicio doméstico: ${error}`
        );
      }
    },
    REGION_HOURS
  );

  // cron que hace scraping sobre datos laborales - servicio doméstico
  cron.schedule(
    cronSchedules.scrapingLaboral,
    async () => {
      try {
        logWithDetails.info(`Tarea de scraping de servicio doméstico iniciado`);
        const lastData = await obtenerUltimaFecha();
        const resultsDomesticos = await scrapeDomesticos(
          process.env.LABORAL_PAGE_2,
          lastData.fecha
        );

        if (resultsDomesticos && resultsDomesticos.length > 0) {
          const resultsGrouped = await agruparPorFechaYCategoria(
            resultsDomesticos
          );
          const save = await guardarDatosAgrupados(resultsGrouped);
          logWithDetails.info(
            `Documentos laboral servicio domestico: Guardados insertos ${save.result.nUpserted} , encontrados ${save.result.nMatched}, modificados ${save.result.nModified}`
          );
          if (save.result.upserted && save.result.upserted.length > 0) {
            logWithDetails.info(
              `Hay nuevos recursos laboral servicio doméstico para notificar`
            );
          }
        } else {
          logWithDetails.info(
            `No se han encontrados actualizaciones laborales servicio doméstico`
          );
        }
      } catch (error) {
        logWithDetails.error(`Error en la tarea de servicio doméstico`);
      }
    },
    REGION_HOURS
  );

  // cron que hace scraping sobre datos previsionales
  cron.schedule(
    cronSchedules.scrapingLegal,
    async () => {
      logWithDetails.info("Tarea de scraping de leyes iniciado");
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
        logWithDetails.error(
          `Error al realizar tarea de scraping de leyes: ${error}`
        );
      }
    },
    REGION_HOURS
  );
  // cron que notifica datos previsionales por IG
  cron.schedule(
    cronSchedules.notifyPrev,
    async () => {
      try {
        let results = await findUnscrapedLegal("previsional- aumentos");
        if (results.length > 0) {
          const resultsData = await scrapePrevisionalLink(results[0].link);
          logWithDetails.info(
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
                logWithDetails.error(
                  `Error procesando el elemento en el índice ${index}:`,
                  error
                );
              }
            }
            if (imageIds.length > 0 && imageUrls.length > 0) {
              try {
                const caption =
                  "Actualización previsional ANSES\n #ANSES #Ley24241 #jubilaciones #pensiones #pbu #puam\n\n";
                await uploadCarouselMedia(imageUrls, caption);
                await deleteImage(imageIds);
              } catch (error) {
                logWithDetails.error(
                  `Error subiendo post IG previsionales: ${error}`
                );
              }
            }
          }
        }
      } catch (error) {
        console.log(error);
        logWithDetails.error(
          `Error al realizar tarea de notificación previsional: ${error}`
        );
      }
    },
    REGION_HOURS
  );

  // cron que envia mensajes Noticias a Telegram bot no notificados
  cron.schedule(
    cronSchedules.notifyNews,
    async () => {
      try {
        logWithDetails.info("Tarea de envío de mensajes de bot iniciada");
        await notifyUnnotifiedNews();
        logWithDetails.info("Tarea de envío de mensajes de bot finalizada");
      } catch (err) {
        logWithDetails.error(`Error en tarea de envío de mensajes: ${err}`);
      }
    },
    REGION_HOURS
  );

  // cron que envia mensajes Normativa con Telegram bot no notificados
  cron.schedule(
    cronSchedules.notifyNewsHours,
    async () => {
      try {
        logWithDetails.info("Tarea de envío de mensajes de bot iniciada");
        await notifyUnnotifiedNews("acts", 3, 40);
        logWithDetails.info("Tarea de envío de mensajes de bot finalizada");
      } catch (err) {
        logWithDetails.error(`Error en tarea de envío de mensajes: ${err}`);
      }
    },
    REGION_HOURS
  );

  // cron que hace scraping en Noticias
  cron.schedule(
    cronSchedules.scrapingNoticias,
    async () => {
      try {
        logWithDetails.info("Tarea de web scraping de noticias iniciada");
        await scrapeNoticias();
        await scrapeElDial();
        await scrapeHammurabi();
        logWithDetails.info("Tarea de web scraping finalizada");
      } catch (err) {
        logWithDetails.error("Error en tarea de web scraping:", err);
      }
    },
    REGION_HOURS
  );

  // cron que hace scraping en Normativa
  cron.schedule(
    cronSchedules.scrapingActs,
    async () => {
      try {
        logWithDetails.info("Tarea de web scraping de normas iniciada");
        await scrapeSaij();
        logWithDetails.info("Tarea de web scraping de normas finalizada");
      } catch (err) {
        logWithDetails.error("Error en la tarea de web scraping Saij:", err);
      }
    },
    REGION_HOURS
  );

  // cron que hace scraping en valores Fees Nación y Fees CABA
  cron.schedule(
    cronSchedules.scrapingFees,
    async () => {
      try {
        logWithDetails.info("Tarea de web scraping de fees iniciada");
        await scrapeFeesData();
        await scrapeFeesDataCABA();
        await scrapeFeesDataBsAs();
        logWithDetails.info("Tarea de web scraping de fees finalizada");
      } catch (err) {
        logWithDetails.error("Error en la tarea de web scraping fees:", err);
      }
    },
    REGION_HOURS
  );

  // cron que busca Cursos
  cron.schedule(
    cronSchedules.scrapingCourses,
    async () => {
      try {
        logWithDetails.info(
          "Tarea de scraping de diplomados y cursos iniciada"
        );
        await scrapeDiplomados(); // Llama a la función de scraping
        await scrapeGPCourses();
        await scrapeUBATalleres();
        await scrapeUBAProgramas();
        logWithDetails.info(
          "Tarea de scraping de diplomados y cursos finalizada"
        );
      } catch (error) {
        logWithDetails.error(
          `Error en la tarea de scraping de diplomados: ${error}`
        );
      }
    },
    REGION_HOURS
  );

  // cron que notifica fees nuevos en Telegram y envía IG posts
  cron.schedule(
    cronSchedules.feesNotificationHours,
    async () => {
      try {
        logWithDetails.info(`Iniciada tarea de notificación de fees`);
        const checkToken = await checkTokenExpiration(accessToken);
        // Notificar fees Nación
        const fees = await findUnnotifiedFees(FeesModel);
        if (fees && fees.length > 0) {
          logWithDetails.info("Hay fees para notitificar");
          const ids = getIdArray(fees);
          const message = generateTelegramMessage(
            "Actualización UMA PJN Ley 27.423",
            fees
          );
          const array = extractMontoAndPeriodo(fees);
          const htmlCode = newFeesPosts(array, "2", ["UMA", "Ley Nº 27.423 "]);

          const localFilePath = `./src/files/${generatedFile}`;
          const generatedFile = await generateScreenshot(htmlCode);
          const image = await uploadImage(localFilePath);

          const imageId = image.public_id;
          const caption =
            "Nuevos valores UMA Ley Nº 27.423 \n#UMA #PoderJudicial #Aranceles #Honorarios\n\n";
          const mediaId = await uploadMedia(
            image.secure_url,
            caption,
            FeesModel,
            ids
          );
          await deleteImage(imageId);
          await cleanupLocalFile(localFilePath);
          const notify = await notifyUnnotifiedFees(message, ids, "fees");
        } else {
          logWithDetails.info(`No hay fees PJN para notificar`);
        }
        // Notificar fees CABA
        const feesCABA = await findUnnotifiedFees(FeesValuesCaba);
        if (feesCABA && feesCABA.length > 0) {
          logWithDetails.info("Hay feesCaba para notitificar");
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
          const ids = getIdArray(feesCABA);
          const notify = await notifyUnnotifiedFees(message, ids, "feesCaba");
        } else {
          logWithDetails.info(`No hay fees CABA para notificar`);
        }
      } catch (err) {
        console.log(err);
        logWithDetails.error(`Error notificación de fees nuevos`);
      }
    },
    REGION_HOURS
  );

  // cron que notifica cursos los días 15 de cada mes
  cron.schedule(
    cronSchedules.notifyCoursesHours,
    async () => {
      try {
        logWithDetails.info(
          "Tarea de notificación de cursos/diplomados programada para el día 15 de cada mes iniciada"
        );
        await notifyUpcomingCourses(); // Llama a la función que deseas ejecutar
        logWithDetails.info(
          "Tarea programada de cursos/diplomados para el día 15 de cada mes finalizada"
        );
      } catch (error) {
        logWithDetails.error(
          `Error en la tarea de notificación de cursos/diplomados programada para el día 15: ${error}`
        );
      }
    },
    REGION_HOURS
  );
  // cron que notifica cursos los días 15 de cada mes
  cron.schedule(
    cronSchedules.notifyNewCoursesHours,
    async () => {
      try {
        logWithDetails.info(
          "Tarea de notificación de cursos/diplomados programada para el día 15 de cada mes iniciada"
        );
        await notifyUpcomingUBACourses(); // Llama a la función que deseas ejecutar
        logWithDetails.info(
          "Tarea programada de cursos/diplomados para el día 15 de cada mes finalizada"
        );
      } catch (error) {
        logWithDetails.error(
          `Error en la tarea de notificación de cursos/diplomados programada para el día 15: ${error}`
        );
      }
    },
    REGION_HOURS
  );

  // cron que limpia el archivo de Logs
  cron.schedule(
    cronSchedules.cleanLogsHours,
    async () => {
      logWithDetails.log("Se ejecuta limpieza de logs");
      clearLogs();
      cleanDirectory("./src/files");
    },
    REGION_HOURS
  );
};

module.exports = { startCronJobs };
