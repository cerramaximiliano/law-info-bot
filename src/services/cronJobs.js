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
const { renderTables, renderTablesComercio, example } = require("../utils/formatHTML");
const { generateTelegramMessageDomesticos, generateMessageTelegramLaboral } = require("../utils/formatText");
const { obtenerNumeroMes } = require("../utils/formatDate");
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
const { saveComercio, findByDateComercio, updateComercioById } = require("../controllers/comercioControllers")
const { saveConstruccion,
  findByDateConstruccion, updateConstruccionById } = require("../controllers/construccionControllers");
const { saveGastronomia, findByDateGastronomia, updateGrastronomiaById } = require("../controllers/gastronomiaControllers");
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
const { legalSystemRole } = require("../config/gptConfig");
const moment = require("moment");
const momentTz = require("moment-timezone");
const { REGION_HOURS, cronSchedules } = require("../config/cronConfig")
const { registerEfemerides } = require("../utils/cronUtils")
const { searchWebData } = require("./search")
const { processSalaryData, compareObjects } = require("../utils/gptUtils")
const { comercioGptResponseModel } = require("../gptModels/laboralModels")
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
const admin = process.env.ADMIN_EMAIL;

// Ejecutar la función de registro de cron de efemerides
registerEfemerides(cronSchedules.efemerides);

const startCronJobs = async () => {

  const fechaConsulta = moment();
  const findLastDocument = await findByDateGastronomia(fechaConsulta, "month");
  if (findLastDocument.exito && findLastDocument.datos && findLastDocument.datos.length > 0) {
    let message = generateMessageTelegramLaboral(findLastDocument.datos[0]);
    if(message.exito){
      console.log(message.mensaje)
      const messageId = await notifyUnnotifiedLaboral(message.mensaje);
      console.log(messageId)
      if(messageId){
        logWithDetails.info(`Mensaje de Telegram enviado de forma exitosa. CCT Hoteleros y Gastronómicos.`)
      }

    }
  }


  // Notify Post IG LABORAL GASTRONOMÍA
  cron.schedule(
    cronSchedules.notifyLaboralGastronomia,
    async () => {
      try {
        const fechaConsulta = moment();
        const findLastDocument = await findByDateGastronomia(fechaConsulta, "month");

        if ( findLastDocument.exito && findLastDocument.datos && findLastDocument.datos.length && findLastDocument.datos[0].notifiedByTelegram ){
          let message = generateMessageTelegramLaboral(findLastDocument.datos[0]);
          if(message.exito){
            console.log(message.mensaje)
            const messageId = await notifyUnnotifiedLaboral(message.mensaje);
            console.log(messageId)
            if(messageId){
              logWithDetails.info(`Mensaje de Telegram enviado de forma exitosa. CCT Hoteleros y Gastronómicos.`)
              const update = await updateGrastronomiaById(findLastDocument.datos[0]._id, { notifiedByTelegram: true })
            }            
          }
        }


        if (findLastDocument.exito && findLastDocument.datos && findLastDocument.datos.length > 0 && findLastDocument.datos[0].postIG === false) {
          logWithDetails.info(`Se encontraron datos para notificar post IG escalas Gastronomía`);



          let imageIds = [];
          let imageUrls = [];

          generatedFile = await generateScreenshot(
            firstLaboralPost(
              {
                subtitle: "CCT 389/04",
                title: "Gastronomía y Hotelería",
              },
              "https://res.cloudinary.com/dqyoeolib/image/upload/v1739804048/qbo7ezp4qmg1yllorxsi.jpg"
            )
          );
          const image = await uploadImage(`./src/files/${generatedFile}`);
          if (image && image.secure_url) {
            imageUrls.push(image.secure_url);
            imageIds.push(image.public_id);
          }
          const tables = renderTablesComercio(findLastDocument.datos[0].detalles, findLastDocument.datos[0].fecha, 5);
          if (tables.length > 0) {
            for (let index = 0; index < tables.length; index++) {
              try {
                const htmlCode = secondLaboralTablePost(
                  tables[index],
                  "https://res.cloudinary.com/dqyoeolib/image/upload/v1739804048/qbo7ezp4qmg1yllorxsi.jpg",
                  "CCT 76/75"
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
                "Actualización escalas CCT 389/04 Trabajadores Gastronómicos y Hoteleros\n #obrerosgastronomia #obreroshoteleria #CCT389/04 #aumentos #laboral #remuneraciones #actualizlaciones\n\n";
              const postIG = await uploadCarouselMedia(imageUrls, caption);
              await deleteImage(imageIds);

              if (postIG.exito) {
                logWithDetails.info(`Actualizando el documento de escalas Gastronomía postIG a true`)
                const update = await updateGrastronomiaById(findLastDocument.datos[0]._id, { postIG: true })
              }
            } catch (error) {
              logWithDetails.error(
                `Error al subir carrusel o actualizar notificaciones: ${error.message}`
              );
            }
          }


        } else {
          logWithDetails.info(`No se encuentraron datos para notificar post IG escalas Gastronomía`)
        }

      } catch (error) {
        logWithDetails.info(`Error en la tarea de posteo de Empleados de Gastronomía: ${error}`)
      }
    },
    REGION_HOURS
  )

  // Notify Post IG LABORAL CONSTRUCCIÓN
  cron.schedule(
    cronSchedules.notifyLaboralConstruccion,
    async () => {
      try {
        const fechaConsulta = moment();
        const findLastDocument = await findByDateConstruccion(fechaConsulta, "month");

        if (findLastDocument.exito && findLastDocument.datos && findLastDocument.datos.length > 0 && findLastDocument.datos[0].postIG === false) {
          logWithDetails.info(`Se encontraron datos para notificar post IG escalas Construcción`);

          let imageIds = [];
          let imageUrls = [];

          generatedFile = await generateScreenshot(
            firstLaboralPost(
              {
                subtitle: "CCT 76/75",
                title: "Obreros de la Construcción",
              },
              "https://res.cloudinary.com/dqyoeolib/image/upload/v1739804740/epvqntlm1aoy9nsffmge.jpg"
            )
          );
          const image = await uploadImage(`./src/files/${generatedFile}`);
          if (image && image.secure_url) {
            imageUrls.push(image.secure_url);
            imageIds.push(image.public_id);
          }

          const tables = renderTablesComercio(findLastDocument.datos[0].detalles, findLastDocument.datos[0].fecha, 5);
          if (tables.length > 0) {
            for (let index = 0; index < tables.length; index++) {
              try {
                const htmlCode = secondLaboralTablePost(
                  tables[index],
                  "https://res.cloudinary.com/dqyoeolib/image/upload/v1739804740/epvqntlm1aoy9nsffmge.jpg",
                  "CCT 76/75"
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
                "Actualización escalas CCT 76/75 Obreros de la Construcción\n #obrerosconstruccion #CCT76/75 #aumentos #laboral #remuneraciones #actualizlaciones\n\n";
              const postIG = await uploadCarouselMedia(imageUrls, caption);
              await deleteImage(imageIds);

              if (postIG.exito) {
                logWithDetails.info(`Actualizando el documento de escalas Construcción postIG a true`)
                const update = await updateConstruccionById(findLastDocument.datos[0]._id, { postIG: true })
                console.log(update)
              }
            } catch (error) {
              logWithDetails.error(
                `Error al subir carrusel o actualizar notificaciones: ${error.message}`
              );
            }
          }
        } else {
          logWithDetails.info(`No se encontraron datos para notificar post IG escalas Construcción`)
        }
      } catch (error) {
        logWithDetails.info(`Error en la tarea de posteo de Empleados de la Construcción: ${error}`)
      }
    },
    REGION_HOURS
  );
  // Notify Post IG LABORAL COMERCIO
  cron.schedule(
    cronSchedules.notifyLaboralComercio,
    async () => {
      try {
        const fechaConsulta = moment();
        const findLastDocument = await findByDateComercio(fechaConsulta, "month");
        if (findLastDocument.exito && findLastDocument.datos && findLastDocument.datos.length > 0 && findLastDocument.datos[0].postIG === false) {
          logWithDetails.info(`Se encontraron datos para notificar post IG escalas Comercio`);

          let imageIds = [];
          let imageUrls = [];

          generatedFile = await generateScreenshot(
            firstLaboralPost(
              {
                subtitle: "CCT 130/75",
                title: "Empleados de Comercio",
              },
              "https://res.cloudinary.com/dqyoeolib/image/upload/v1739805013/hrobaxmqmomqd52skg5e.jpg"
            ))
          const image = await uploadImage(`./src/files/${generatedFile}`);
          if (image && image.secure_url) {
            imageUrls.push(image.secure_url);
            imageIds.push(image.public_id);
          }

          const tables = renderTablesComercio(findLastDocument.datos[0].detalles, findLastDocument.datos[0].fecha, 5);
          if (tables.length > 0) {
            for (let index = 0; index < tables.length; index++) {
              try {
                const htmlCode = secondLaboralTablePost(
                  tables[index],
                  "https://res.cloudinary.com/dqyoeolib/image/upload/v1739805013/hrobaxmqmomqd52skg5e.jpg",
                  "CCT 130/75"
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
                "Actualización escalas CCT 130/75 Empleados de Comercio\n #empleadoscomercio #CCT130/75 #aumentos #laboral #remuneraciones #actualizlaciones\n\n";
              const postIG = await uploadCarouselMedia(imageUrls, caption);
              await deleteImage(imageIds);
              if (postIG.exito) {
                logWithDetails.info(`Actualizando el documento de escalas Comercio postIG a true`)
                const update = await updateComercioById(findLastDocument.datos[0]._id, { postIG: true })
              }
            } catch (error) {
              logWithDetails.error(
                `Error al subir carrusel o actualizar notificaciones: ${error.message}`
              );
            }
          }
        } else {
          logWithDetails.info(`No se encontraron datos para notificar post IG escalas Comercio`)
        }
      } catch (error) {
        logWithDetails.info(`Error en la tarea de notificaciones de Empleados de Comercio: ${error}`)
      }
    },
    REGION_HOURS
  );
  // Scraping y GEN AI Convenio Gastronomía
  cron.schedule(
    cronSchedules.scrapingLaboralGastronomia,
    async () => {
      const currentMonth = moment().format("MMMM");
      const currentYear = moment().format("YYYY");
      const month = obtenerNumeroMes(currentMonth);
      const fechaActual = moment(`${currentYear}-${month}-01`, "YYYY-MM-DD");
      const fechaConsulta = fechaActual.clone().startOf('month');
      const findRecord = await findByDateGastronomia(fechaConsulta)

      if (findRecord.exito) {
        logWithDetails.info(`No hay actualizaciones para Empleados de Gastronomía y Hotelería.`)
      } else {
        logWithDetails.info(`Actualizando base de datos Empleados de Gastronomía y Hotelería`)
        const searchResults = await searchWebData(`escalas salariales gastronomía argentina ${currentMonth} ${currentYear}`, 10, "hoteleria");
        const result = await askQuestion(`Basado en estas fuentes, necesito datos de salarios devengados en  ${currentMonth} de ${currentYear} en materia salarial de hotelería y gastronomía de cada una de las fuentes. Si no hubo actualizaciones en ${currentMonth} ${currentYear}, devuelve un resultado de salarios vacio:\n\n${searchResults.map(r => `Contenido: ${r.content}`).join("\n\n")}.`, legalSystemRole(comercioGptResponseModel))
        const data = processSalaryData(result.choices[0].message.content, fechaConsulta);
        if (data.exito) {
          logWithDetails.info("Hay actualizaciones de escala salarial de Hoteleros y Gastronómicos.")
          const result = compareObjects(data.actualizaciones_salariales)
          const save = saveGastronomia(result)
        } else {
          logWithDetails.info(`No hay actualizaciones de escala salarial de Hoteleros y Gastronómicos: ${data.error}`)
        }
      }

    },
    REGION_HOURS
  )
  // Scraping y GEN AI Convenio Construcción
  cron.schedule(
    cronSchedules.scrapingLaboralConstruccion,
    async () => {
      try {
        const currentMonth = moment().format("MMMM");
        const currentYear = moment().format("YYYY");
        const month = obtenerNumeroMes(currentMonth);
        const fechaActual = moment(`${currentYear}-${month}-01`, "YYYY-MM-DD");
        const fechaConsulta = fechaActual.clone().startOf('month');
        const findRecord = await findByDateConstruccion(fechaConsulta)

        if (findRecord.exito) {
          logWithDetails.info(`No hay actualizaciones para Empleados de Construcción.`)
        } else {
          logWithDetails.info("Actualizando base de datos Empleados de Construcción.")
          const searchResults = await searchWebData(`escalas salariales obreros de la construcción argentina ${currentMonth} ${currentYear}`, 10, "construccion");
          const result = await askQuestion(`Basado en estas fuentes, necesito datos de salarios devengados en  ${currentMonth} de ${currentYear} en materia salarial de obreros de la construccion de cada una de las fuentes. Si no hubo actualizaciones en ${currentMonth} ${currentYear}, devuelve un resultado de salarios vacio:\n\n${searchResults.map(r => `Contenido: ${r.content}`).join("\n\n")}.`, legalSystemRole(comercioGptResponseModel))
          const data = processSalaryData(result.choices[0].message.content, fechaConsulta);
          if (data.exito) {
            logWithDetails.info("Hay actualizaciones de escala salarial de Obreros de la Construcción.")
            const result = compareObjects(data.actualizaciones_salariales)
            const save = saveConstruccion(result)
          } else {
            logWithDetails.info(`No hay actualizaciones de escala salarial de Obreros de la Construcción: ${data.error}`)
          }
        }
      } catch (error) {
        logWithDetails.error(`Error al actualizar base de datos Empleados de Construcción: ${error}`)
      }

    },
    REGION_HOURS
  );
  // Scraping y GEN AI Convenio Comercio
  cron.schedule(
    cronSchedules.scrapingLaboralComercio,
    async () => {
      try {
        const currentMonth = moment().format("MMMM");
        const currentYear = moment().format("YYYY");
        const fechaActual = moment();
        const fechaConsulta = fechaActual.clone().startOf('month');
        const findRecord = await findByDateComercio(fechaConsulta);

        if (findRecord.exito) {
          logWithDetails.info(`No hay actualizaciones para Empleados de Comercio.`)
        } else {
          logWithDetails.info("Actualizando base de datos Empleados de Comercio.")
          const searchResults = await searchWebData(`escalas salariales empleados de comercio argentina ${currentMonth} ${currentYear}`, 10, "comercio");
          const result = await askQuestion(`Basado en estas fuentes, necesito datos de salarios devengados en  ${currentMonth} de ${currentYear} en materia salarial de empleados de comercio de cada una de las fuentes. Si no hubo actualizaciones en ${currentMonth} ${currentYear}, devuelve un resultado de salarios vacio:\n\n${searchResults.map(r => `Contenido: ${r.content}`).join("\n\n")}.`, legalSystemRole(comercioGptResponseModel))
          const data = processSalaryData(result.choices[0].message.content, fechaConsulta);
          if (data.exito) {
            logWithDetails.info("Hay actualizaciones de escala salarial de Empleados de Comercio.")
            const result = compareObjects(data.actualizaciones_salariales)
            const save = saveComercio(result)
          } else {
            logWithDetails.info(`No hay actualizaciones de escala salarial de Empleados de Comercio: ${data.error}`)
          }
        }
      } catch (error) {
        logWithDetails.error(`Error al actualizar base de datos Empleados de Comercio: ${error}`)
      }
    },
    REGION_HOURS
  );


  // Reporte diario de logs
  cron.schedule(
    cronSchedules.loggerReportHours,
    async () => {
      try {
        const analyzer = new LogAnalyzer("src/logs/app.log");

        const regionTimezone = "America/Argentina/Buenos_Aires";
        const nowInTimezone = momentTz().tz(regionTimezone);
        const endOfDay = nowInTimezone.endOf("day");
        const report = await analyzer.generateReport(endOfDay);

        const textReport = formatLogReportEmail(report);
        sendEmailController(
          admin,
          textReport,
          `[LOG REPORT] LAW BOT ${endOfDay.format("DD-MM-YYYY")}`,
          [report.filepath]
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
      cleanDirectory("src/files");
    },
    REGION_HOURS
  );
};

module.exports = { startCronJobs };
