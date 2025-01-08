const News = require("../models/news");
const Acts = require("../models/acts");
const FeesModel = require("../models/feesValues");
const Courses = require("../models/courses");
const { saveNewNews } = require("../controllers/notiicasControllers");
const hashStringToNumber = require("../utils/formatId");
const { logWithDetails } = require("../config/logger");
const {
  parseDate,
  parseDateFormat,
  formatPeriod,
} = require("../utils/formatDate");
const moment = require("moment");
require("moment/locale/es");
const axios = require("axios");
const Tracking = require("../models/tracking");
const poll = require("promise-poller").default;
const fs = require("fs");
const path = require("path");

const {
  saveOrUpdateTrackingData,
} = require("../controllers/trackingControllers");
const {
  saveFeesValuesAfterLastVigencia,
  saveFeesValuesAfterLastVigenciaCaba,
  saveNewFeesBA,
} = require("../controllers/feesControllers");
const { parseDateAndMonto } = require("../utils/formatText");

const siteDetails = {
  sitekey: process.env.RECAPTCHA_SCRAPE_PAGE_SITE_KEY,
  pageurl: process.env.RECAPTCHA_SCRAPE_PAGE,
};

const apiKey = process.env.RECAPTCHA_API_KEY;

const { browserPool, waitForInitialization } = require("../utils/browserPool");
const { retryOperation, cleanupMemory } = require("../utils/scrapingUtils");
const defaultPuppeteerConfig = require("../config/puppeteerConfig");

const scrapeNoticias = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      // Navega a la página objetivo
      await page.goto("https://www.diariojudicial.com/", {
        waitUntil: "networkidle2",
      });

      // Extrae los elementos con texto y href que contienen "news"
      const elements = await page.evaluate(() => {
        const links = [];
        // Selecciona todos los elementos con un atributo href
        document.querySelectorAll("a[href]").forEach((anchor) => {
          const textContent = anchor.textContent.trim(); // Extrae el texto
          const href = anchor.href; // Extrae el href

          // Verifica si el href contiene la palabra "news"
          if (href.includes("news") && textContent) {
            links.push({ text: textContent, href: href });
          }
        });

        // Agrupa los enlaces por href
        const groupedLinks = links.reduce((acc, current) => {
          const existing = acc.find((item) => item.href === current.href);
          if (existing) {
            // Actualiza title (el más corto) y text (el más largo)
            const newTitle =
              current.text.length < existing.title.length
                ? current.text
                : existing.title;
            const newText =
              current.text.length > existing.text.length
                ? current.text
                : existing.text;

            // Asegura que title y text sean diferentes
            if (newTitle !== newText) {
              existing.title = newTitle;
              existing.text = newText;
            }
          } else {
            // Extrae el número del href utilizando una expresión regular
            const numberMatch = current.href.match(/news-(\d+)-/);
            const number = numberMatch ? numberMatch[1] : null;

            // Añade nuevo elemento al grupo con el número extraído
            acc.push({
              href: current.href,
              title: current.text,
              text: current.text,
              id: Number(number), // Agrega el número extraído
              siteId: "diariojudicial",
            });
          }
          return acc;
        }, []);

        // Filtra los enlaces donde title y text son iguales
        const filteredLinks = groupedLinks.filter(
          (item) => item.title !== item.text
        );

        return filteredLinks;
      });

      const savedNews = await saveNewNews(elements, "diariojudicial");
    };
    const result = await retryOperation(scrapeOperation);

    cleanupMemory();
    return result;
  } catch (error) {
    logWithDetails.info(`Error en la tarea de scraping: ${error}`);
  } finally {
    if (browser) {
      try {
        await browserPool.release(browser);
        logWithDetails.info("Navegador liberado exitosamente");
      } catch (releaseError) {
        logError("Error liberando navegador", releaseError);
      }
    }
  }
};

const scrapeInfojus = async () => {
  let browser;
  try {
    // Usar el pool de navegadores en lugar de crear uno nuevo
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    // Encapsular la lógica principal de scraping en una función para usar con retryOperation
    const scrapeOperation = async () => {
      // Navega al sitio web con timeout configurado
      await page.goto("http://www.infojusnoticias.gov.ar/", {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      logWithDetails.info("Iniciando extracción de artículos de Infojus");

      // Extraer los artículos de la página
      const articles = await page.evaluate(() => {
        const elements = document.querySelectorAll("article");
        const results = [];

        elements.forEach((element) => {
          try {
            const hrefElement = element.querySelector("h3 a");
            const textElement = element.querySelector("p.bajada-home");

            if (hrefElement && textElement) {
              const href = hrefElement.getAttribute("href");
              const title = hrefElement.innerText.trim();
              const text = textElement.innerText.trim();
              const idMatch = href.match(/-(\d+)\.html$/);
              const id = idMatch ? parseInt(idMatch[1], 10) : null;

              if (id) {
                results.push({
                  href: `http://www.infojusnoticias.gov.ar${href}`,
                  title,
                  text,
                  id,
                  siteId: "infojus",
                });
              }
            }
          } catch (err) {
            console.error("Error procesando elemento:", err);
          }
        });

        return results;
      });

      logWithDetails.info(
        `Se encontraron ${articles.length} artículos para procesar`
      );

      // Procesar los artículos en lotes para optimizar el uso de memoria
      const BATCH_SIZE = 5;
      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (article) => {
            try {
              const exists = await News.findOne({ id: article.id });
              if (!exists) {
                const newsItem = new News(article);
                await newsItem.save();
                logWithDetails.info(
                  `Artículo guardado: ${article.title} (ID: ${article.id})`
                );
              } else {
                logWithDetails.info(
                  `Artículo ya existe: ${article.title} (ID: ${article.id})`
                );
              }
            } catch (error) {
              logWithDetails.error(
                `Error guardando artículo: ${article.title} (ID: ${article.id})`,
                error
              );
            }
          })
        );

        // Limpiar memoria después de cada lote
        cleanupMemory();
      }

      return articles.length;
    };

    // Ejecutar la operación con reintentos
    const articlesProcessed = await retryOperation(scrapeOperation);
    logWithDetails.info(
      `Scraping de Infojus completado. Artículos procesados: ${articlesProcessed}`
    );

    return articlesProcessed;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeInfojus: ${error.stack}`);
    throw error;
  } finally {
    if (browser) {
      // Devolver el navegador al pool en lugar de cerrarlo
      await browserPool.release(browser);
    }
  }
};

const scrapeElDial = async () => {
  let browser;
  try {
    // Usar el pool de navegadores
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de El Dial");

      // Navegar al sitio con timeout configurado
      await page.goto(
        "https://www.eldial.com/nuevo/nuevo_diseno/v2/index.asp",
        {
          waitUntil: "networkidle2",
          timeout: defaultPuppeteerConfig.timeout,
        }
      );

      // Extraer artículos
      const articles = await page.evaluate(() => {
        const elements = document.querySelectorAll("li");
        const results = [];

        elements.forEach((element) => {
          try {
            const hrefElement = element.querySelector("h4 a");
            const textElement = element.querySelector("p");

            if (hrefElement && textElement) {
              const href = hrefElement.getAttribute("href");
              const title = hrefElement.innerText.trim();
              const text = textElement.innerText.trim();
              const idMatch = href.match(/id=(\d+)/);
              const id = idMatch ? parseInt(idMatch[1], 10) : null;

              if (id) {
                results.push({
                  href: `https://www.eldial.com/nuevo/nuevo_diseno/v2/${href}`,
                  title,
                  text,
                  id,
                  siteId: "eldial",
                });
              }
            }
          } catch (error) {
            console.error("Error procesando elemento:", error);
          }
        });

        return results;
      });

      logWithDetails.info(
        `Se encontraron ${articles.length} artículos para procesar`
      );

      // Procesar artículos en lotes para optimizar memoria
      const BATCH_SIZE = 5;
      let processedCount = 0;
      let savedCount = 0;

      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (article) => {
            try {
              const exists = await News.findOne({ id: article.id });
              if (!exists) {
                const newsItem = new News(article);
                await newsItem.save();
                savedCount++;
                logWithDetails.info(
                  `Artículo guardado: ${article.title} (ID: ${article.id})`
                );
              } else {
                logWithDetails.info(
                  `Artículo ya existe: ${article.title} (ID: ${article.id})`
                );
              }
              processedCount++;
            } catch (error) {
              logWithDetails.error(
                `Error guardando artículo: ${article.title} (ID: ${article.id})`,
                { error: error.message, stack: error.stack }
              );
            }
          })
        );

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${articles.length} artículos procesados`
        );
      }

      return {
        total: articles.length,
        processed: processedCount,
        saved: savedCount,
      };
    };

    // Ejecutar la operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de El Dial completado", {
      totalArticles: result.total,
      processedArticles: result.processed,
      savedArticles: result.saved,
    });

    return result;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeElDial: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (browser) {
      // Devolver el navegador al pool
      await browserPool.release(browser);
    }
  }
};

const scrapeHammurabi = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de Hammurabi");

      // Navegar al sitio
      await page.goto(
        "https://www.hammurabi.com.ar/noticias-juridicas-de-la-semana/",
        {
          waitUntil: "networkidle2",
          timeout: defaultPuppeteerConfig.timeout,
        }
      );

      // Extraer artículos
      const articles = await page.evaluate(() => {
        const elements = document.querySelectorAll("li");
        const results = [];

        elements.forEach((element) => {
          try {
            const hrefElement = element.querySelector("p a");
            const idElement = element.querySelector("p");

            if (hrefElement && idElement) {
              const href = hrefElement.getAttribute("href");
              const title = hrefElement.innerText.trim();
              const idText = idElement.getAttribute("id");

              if (idText && href && title) {
                results.push({
                  href: href.trim(),
                  title,
                  text: "", // No hay texto adicional
                  idText,
                  siteId: "hammurabi",
                });
              }
            }
          } catch (error) {
            console.error("Error procesando elemento:", error);
          }
        });

        return results;
      });

      logWithDetails.info(
        `Se encontraron ${articles.length} artículos para procesar`
      );

      // Procesar artículos en lotes
      const BATCH_SIZE = 5;
      let processedCount = 0;
      let savedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (article) => {
            try {
              const articleId = hashStringToNumber(article.idText);
              const exists = await News.findOne({ id: articleId });

              if (!exists) {
                const newsItem = new News({
                  href: article.href,
                  title: article.title,
                  text: article.text,
                  id: articleId,
                  siteId: article.siteId,
                });
                await newsItem.save();
                savedCount++;
                logWithDetails.info(
                  `Artículo guardado: ${article.title} (ID: ${articleId})`
                );
              } else {
                logWithDetails.info(
                  `Artículo ya existe: ${article.title} (ID: ${articleId})`
                );
              }
              processedCount++;
            } catch (error) {
              errorCount++;
              logWithDetails.error(
                `Error guardando artículo: ${article.title}`,
                {
                  error: error.message,
                  stack: error.stack,
                  articleData: article,
                }
              );
            }
          })
        );

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${articles.length} artículos procesados`
        );
      }

      return {
        total: articles.length,
        processed: processedCount,
        saved: savedCount,
        errors: errorCount,
      };
    };

    // Ejecutar la operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de Hammurabi completado", {
      totalArticles: result.total,
      processedArticles: result.processed,
      savedArticles: result.saved,
      errorCount: result.errors,
    });

    return result;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeHammurabi: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeSaij = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de SAIJ");

      const url = "http://www.saij.gob.ar/boletin-diario/";
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      // Extraer las normas
      const newsItems = await page.evaluate(() => {
        const items = [];
        const idPatternDN = /DN(\d+)/;
        const urlPattern = /id=(\d+)/;

        document.querySelectorAll(".detalle").forEach((detalle) => {
          try {
            const href = detalle.querySelector(".titulo-norma a")?.href || "";
            const titleElement = detalle.querySelector(".titulo-norma a");
            const title = titleElement
              ? titleElement.textContent.trim() +
                " (" +
                (detalle
                  .querySelector(".subtitulo-norma")
                  ?.textContent.trim() || "") +
                ")"
              : "";
            const text =
              detalle.querySelector(".sintesis")?.textContent.trim() || "";

            // Extraer ID usando ambos patrones
            const idMatchDN = href.match(idPatternDN);
            const idMatchURL = href.match(urlPattern);
            let id = null;

            if (idMatchDN) {
              id = parseInt(idMatchDN[1], 10);
            } else if (idMatchURL) {
              id = parseInt(idMatchURL[1], 10);
            }

            if (href && title && text && id) {
              items.push({ href, title, text, id });
            }
          } catch (error) {
            console.error("Error procesando norma:", error);
          }
        });
        return items;
      });

      logWithDetails.info(
        `Se encontraron ${newsItems.length} normas para procesar`
      );

      // Procesar normas en lotes
      const BATCH_SIZE = 5;
      let processedCount = 0;
      let savedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < newsItems.length; i += BATCH_SIZE) {
        const batch = newsItems.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (item) => {
            try {
              const existingNews = await Acts.findOne({ id: item.id });

              if (!existingNews) {
                const newsItem = new Acts({
                  ...item,
                  siteId: "saij",
                  notifiedByTelegram: false,
                  notificationDate: null,
                });
                await newsItem.save();
                savedCount++;
                logWithDetails.info(
                  `Norma guardada: ${item.title} (ID: ${item.id})`
                );
              } else {
                logWithDetails.info(
                  `Norma ya existe: ${item.title} (ID: ${item.id})`
                );
              }
              processedCount++;
            } catch (error) {
              errorCount++;
              logWithDetails.error(`Error guardando norma: ${item.title}`, {
                error: error.message,
                stack: error.stack,
                itemData: item,
              });
            }
          })
        );

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${newsItems.length} normas procesadas`
        );
      }

      return {
        total: newsItems.length,
        processed: processedCount,
        saved: savedCount,
        errors: errorCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de SAIJ completado", {
      totalNormas: result.total,
      normasProcesadas: result.processed,
      normasGuardadas: result.saved,
      errores: result.errors,
    });

    return result;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeSaij: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeGPCourses = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de cursos de Grupo Professional");

      // Navegar a la página principal de cursos
      await page.goto(
        "https://www.grupoprofessional.com.ar/cursos/cursos-streaming",
        {
          waitUntil: "networkidle2",
          timeout: defaultPuppeteerConfig.timeout,
        }
      );

      // Extraer listado inicial de cursos
      const cursos = await page.evaluate(() => {
        const cursosElements = document.querySelectorAll(".card-block");
        const cursosData = [];

        cursosElements.forEach((cursoElement) => {
          try {
            const title = cursoElement
              .querySelector(".card-title")
              ?.textContent.trim();
            const date = cursoElement
              .querySelector(".card-text")
              ?.textContent.trim();
            const link = cursoElement.querySelector("a")?.href;

            if (title && date && link) {
              cursosData.push({
                title,
                date,
                link,
              });
            }
          } catch (error) {
            console.error("Error procesando curso:", error);
          }
        });

        return cursosData;
      });

      logWithDetails.info(
        `Se encontraron ${cursos.length} cursos para procesar`
      );

      // Procesar cursos en lotes
      const BATCH_SIZE = 3; // Batch más pequeño por la navegación adicional
      let processedCount = 0;
      let savedCount = 0;
      let errorCount = 0;
      let invalidDateCount = 0;

      for (let i = 0; i < cursos.length; i += BATCH_SIZE) {
        const batch = cursos.slice(i, i + BATCH_SIZE);

        for (const curso of batch) {
          try {
            // Navegar a la página del curso
            await page.goto(curso.link, {
              waitUntil: "networkidle2",
              timeout: defaultPuppeteerConfig.timeout,
            });

            // Extraer datos adicionales
            const additionalData = await page.evaluate(() => {
              const priceElement = document.querySelector(".precio-curso");
              const typeElement = document
                .querySelector(".fa-video")
                ?.parentElement?.textContent.trim();

              return {
                price: priceElement
                  ? priceElement.textContent.replace(/[^0-9]/g, "") + " ARS"
                  : "No disponible",
                type: typeElement || "No disponible",
              };
            });

            const parsedDate = parseDate(curso.date);

            if (parsedDate) {
              const existingCourse = await Courses.findOne({
                title: curso.title,
                date: parsedDate,
              });

              if (!existingCourse) {
                const nuevoCurso = new Courses({
                  title: curso.title,
                  date: parsedDate,
                  link: curso.link,
                  price: additionalData.price,
                  type: additionalData.type,
                  siteId: "Grupo Profesional",
                });
                await nuevoCurso.save();
                savedCount++;
                logWithDetails.info(
                  `Curso guardado: ${
                    curso.title
                  } (Fecha: ${parsedDate.toISOString()})`
                );
              } else {
                logWithDetails.info(`Curso ya existe: ${curso.title}`);
              }
              processedCount++;
            } else {
              invalidDateCount++;
              logWithDetails.warn(
                `Fecha inválida para el curso: ${curso.title} (${curso.date})`
              );
            }
          } catch (error) {
            errorCount++;
            logWithDetails.error(`Error procesando curso: ${curso.title}`, {
              error: error.message,
              stack: error.stack,
              cursoData: curso,
            });
          }
        }

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${cursos.length} cursos procesados`
        );
      }

      return {
        total: cursos.length,
        processed: processedCount,
        saved: savedCount,
        errors: errorCount,
        invalidDates: invalidDateCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de Grupo Professional completado", {
      totalCursos: result.total,
      cursosProcesados: result.processed,
      cursosGuardados: result.saved,
      errores: result.errors,
      fechasInvalidas: result.invalidDates,
    });

    return result;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeGPCourses: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeDiplomados = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info(
        "Iniciando scraping de diplomados de Grupo Professional"
      );

      // Navegar a la página de diplomados
      await page.goto(
        "https://www.grupoprofessional.com.ar/diplomados-derecho/",
        {
          waitUntil: "networkidle2",
          timeout: defaultPuppeteerConfig.timeout,
        }
      );

      // Extraer listado inicial de diplomados
      const diplomados = await page.evaluate(() => {
        const diplomadosElements = document.querySelectorAll(
          ".col-md-4.card-diplomado-individual"
        );
        const diplomadosData = [];

        diplomadosElements.forEach((diplomadoElement) => {
          try {
            const titleElement =
              diplomadoElement.querySelector(".card-title a");
            const linkElement = diplomadoElement.querySelector(".card-title a");

            if (titleElement && linkElement) {
              const title = titleElement.textContent.trim();
              const link = linkElement.href;

              if (title && link) {
                diplomadosData.push({ title, link });
              }
            }
          } catch (error) {
            console.error("Error procesando diplomado:", error);
          }
        });

        return diplomadosData;
      });

      logWithDetails.info(
        `Se encontraron ${diplomados.length} diplomados para procesar`
      );

      // Procesar diplomados en lotes
      const BATCH_SIZE = 3; // Batch pequeño por la navegación adicional
      let processedCount = 0;
      let savedCount = 0;
      let errorCount = 0;
      let invalidDateCount = 0;

      for (let i = 0; i < diplomados.length; i += BATCH_SIZE) {
        const batch = diplomados.slice(i, i + BATCH_SIZE);

        for (const diplomado of batch) {
          try {
            // Navegar a la página del diplomado
            await page.goto(diplomado.link, {
              waitUntil: "networkidle2",
              timeout: defaultPuppeteerConfig.timeout,
            });

            // Extraer datos adicionales
            const additionalData = await page.evaluate(() => {
              const formatPrice = (priceString) => {
                const numericPrice = priceString
                  .replace(/[^0-9,]/g, "")
                  .replace(",", ".");
                return `${numericPrice} ARS`;
              };

              const dateElement = document
                .querySelector(".fa-calendar-alt")
                ?.parentElement?.textContent.trim();
              const typeElement = document
                .querySelector(".fa-video")
                ?.parentElement?.textContent.trim();
              const priceElement = document.querySelector(".datos-precio h3");
              const priceText = priceElement
                ? priceElement.childNodes[0].textContent.trim()
                : null;

              return {
                date: dateElement
                  ? dateElement.replace("Fecha de inicio:", "").trim()
                  : null,
                type: typeElement
                  ? typeElement.replace("Modalidad  de cursada:", "").trim()
                  : "Modalidad no disponible",
                price: priceText
                  ? formatPrice(priceText)
                  : "Precio no disponible",
              };
            });

            // Parsear la fecha
            const parsedDate = additionalData.date
              ? parseDateFormat(additionalData.date)
              : null;

            if (parsedDate) {
              const existingCourse = await Courses.findOne({
                title: diplomado.title,
                date: parsedDate,
              });

              if (!existingCourse) {
                const nuevoCurso = new Courses({
                  title: diplomado.title,
                  date: parsedDate,
                  link: diplomado.link,
                  price: additionalData.price,
                  type: additionalData.type,
                  siteId: "Grupo Profesional",
                });
                await nuevoCurso.save();
                savedCount++;
                logWithDetails.info(
                  `Diplomado guardado: ${
                    diplomado.title
                  } (Fecha: ${parsedDate.toISOString()})`
                );
              } else {
                logWithDetails.info(`Diplomado ya existe: ${diplomado.title}`);
              }
              processedCount++;
            } else {
              invalidDateCount++;
              logWithDetails.warn(
                `Fecha inválida para el diplomado: ${diplomado.title} (${additionalData.date})`
              );
            }
          } catch (error) {
            errorCount++;
            logWithDetails.error(
              `Error procesando diplomado: ${diplomado.title}`,
              {
                error: error.message,
                stack: error.stack,
                diplomadoData: diplomado,
              }
            );
          }
        }

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${diplomados.length} diplomados procesados`
        );
      }

      return {
        total: diplomados.length,
        processed: processedCount,
        saved: savedCount,
        errors: errorCount,
        invalidDates: invalidDateCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de diplomados completado", {
      totalDiplomados: result.total,
      diplomadosProcesados: result.processed,
      diplomadosGuardados: result.saved,
      errores: result.errors,
      fechasInvalidas: result.invalidDates,
    });

    return result;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeDiplomados: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeUBATalleres = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de talleres UBA");

      await page.goto("http://www.derecho.uba.ar/graduados/talleres/", {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      // Extraer información de talleres
      const talleres = await page.evaluate(() => {
        const talleresElements = document.querySelectorAll(".modulo");
        const talleresData = [];

        talleresElements.forEach((tallerElement) => {
          try {
            const titleElement = tallerElement.querySelector("h3 a");
            const title = titleElement?.textContent
              .replace(/^\d+\.\s*/, "")
              .trim();
            const link = titleElement?.href;
            const typeElement = tallerElement.querySelector("span.badge");
            const type = typeElement?.textContent.trim();

            const contenidoElement =
              tallerElement.querySelector(".contenido p");
            let dateText = null;

            if (contenidoElement) {
              const regex = /(\d{2} de [a-zA-Z]+(?: de \d{4})?)/;
              const match = contenidoElement.textContent.match(regex);
              if (match) {
                dateText = match[0];
              }
            }

            if (title && link && type && dateText) {
              talleresData.push({
                title,
                link,
                dateText,
                type,
                siteId: "UBA Derecho",
              });
            }
          } catch (error) {
            console.error("Error procesando taller:", error);
          }
        });

        return talleresData;
      });

      logWithDetails.info(
        `Se encontraron ${talleres.length} talleres para procesar`
      );

      // Procesar talleres en lotes
      const BATCH_SIZE = 5;
      let processedCount = 0;
      let savedCount = 0;
      let errorCount = 0;
      let invalidDateCount = 0;

      for (let i = 0; i < talleres.length; i += BATCH_SIZE) {
        const batch = talleres.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (taller) => {
            try {
              if (taller.dateText) {
                let dateText = taller.dateText;
                if (!/\d{4}/.test(dateText)) {
                  dateText += ` de ${new Date().getFullYear()}`;
                }

                const parsedDate = moment(
                  dateText,
                  "DD [de] MMMM [de] YYYY",
                  "es"
                );

                if (parsedDate.isValid()) {
                  const existingCourse = await Courses.findOne({
                    title: taller.title,
                    date: parsedDate.toDate(),
                  });

                  if (!existingCourse) {
                    const nuevoCurso = new Courses({
                      title: taller.title,
                      date: parsedDate.toDate(),
                      link: taller.link,
                      type: taller.type,
                      siteId: taller.siteId,
                    });
                    await nuevoCurso.save();
                    savedCount++;
                    logWithDetails.info(
                      `Taller guardado: ${
                        taller.title
                      } (Fecha: ${parsedDate.format("DD/MM/YYYY")})`
                    );
                  } else {
                    logWithDetails.info(`Taller ya existe: ${taller.title}`);
                  }
                  processedCount++;
                } else {
                  invalidDateCount++;
                  logWithDetails.warn(
                    `Fecha inválida para el taller: ${taller.title} (${dateText})`
                  );
                }
              } else {
                invalidDateCount++;
                logWithDetails.warn(
                  `Fecha no encontrada para el taller: ${taller.title}`
                );
              }
            } catch (error) {
              errorCount++;
              logWithDetails.error(`Error procesando taller: ${taller.title}`, {
                error: error.message,
                stack: error.stack,
                tallerData: taller,
              });
            }
          })
        );

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${talleres.length} talleres procesados`
        );
      }

      return {
        total: talleres.length,
        processed: processedCount,
        saved: savedCount,
        errors: errorCount,
        invalidDates: invalidDateCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de talleres UBA completado", {
      totalTalleres: result.total,
      talleresProcesados: result.processed,
      talleresGuardados: result.saved,
      errores: result.errors,
      fechasInvalidas: result.invalidDates,
    });

    return result;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeUBATalleres: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeUBAProgramas = async () => {
  let browser;
  try {
  logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de programas UBA");

      await page.goto(
        "http://www.derecho.uba.ar/graduados/programas-de-perfeccionamiento/",
        {
          waitUntil: "networkidle2",
          timeout: defaultPuppeteerConfig.timeout,
        }
      );

      // Extraer información de programas
      const programas = await page.evaluate(() => {
        const programasElements = document.querySelectorAll(".modulo");
        const programasData = [];

        programasElements.forEach((programaElement) => {
          try {
            const titleElement = programaElement.querySelector("h3 a");
            let title = titleElement?.textContent
              .replace(/^\d+\.\s*/, "")
              .trim();
            title = title.replace(/^-+\s*/, "").trim();

            const link = titleElement?.href;
            const typeElement = programaElement.querySelector("span.badge");
            const type = typeElement?.textContent.trim();
            const contenidoElement =
              programaElement.querySelector(".contenido p");
            let dateText = null;

            if (contenidoElement) {
              const regex = /(\d{2}-\d{2}-\d{4})/;
              const match = contenidoElement.textContent.match(regex);
              if (match) {
                dateText = match[0];
              }

              const priceUBAMatch = contenidoElement.textContent.match(
                /Precio para graduadas\/os UBA: (Gratis|\$\d{1,3}(?:\.\d{3})*)/
              );
              const priceOthersMatch = contenidoElement.textContent.match(
                /Precio para graduadas\/os de otras universidades: (Gratis|\$\d{1,3}(?:\.\d{3})*)/
              );

              const priceUBA = priceUBAMatch
                ? priceUBAMatch[1].trim()
                : "No disponible";
              const priceOthers = priceOthersMatch
                ? priceOthersMatch[1].trim()
                : "No disponible";

              if (title && link && type && dateText) {
                programasData.push({
                  title,
                  link,
                  dateText,
                  type,
                  siteId: "UBA Derecho",
                  priceUBA,
                  priceOthers,
                });
              }
            }
          } catch (error) {
            console.error("Error procesando programa:", error);
          }
        });

        return programasData;
      });

      logWithDetails.info(
        `Se encontraron ${programas.length} programas para procesar`
      );

      // Procesar programas en lotes
      const BATCH_SIZE = 5;
      let processedCount = 0;
      let savedCount = 0;
      let errorCount = 0;
      let invalidDateCount = 0;

      for (let i = 0; i < programas.length; i += BATCH_SIZE) {
        const batch = programas.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (programa) => {
            try {
              if (programa.dateText) {
                const parsedDate = moment(programa.dateText, "DD-MM-YYYY");

                if (parsedDate.isValid()) {
                  // Formatear precios
                  const formattedPriceUBA = programa.priceUBA
                    ? formatPrice(programa.priceUBA)
                    : "No disponible";
                  const formattedPriceOthers = programa.priceOthers
                    ? formatPrice(programa.priceOthers)
                    : "No disponible";

                  const existingCourse = await Courses.findOne({
                    title: programa.title,
                    date: parsedDate.toDate(),
                  });

                  if (!existingCourse) {
                    const nuevoPrograma = new Courses({
                      title: programa.title,
                      date: parsedDate.toDate(),
                      link: programa.link,
                      type: programa.type,
                      siteId: programa.siteId,
                      priceUBA: formattedPriceUBA,
                      price: formattedPriceOthers,
                    });
                    await nuevoPrograma.save();
                    savedCount++;
                    logWithDetails.info(
                      `Programa guardado: ${
                        programa.title
                      } (Fecha: ${parsedDate.format("DD/MM/YYYY")})`
                    );
                  } else {
                    logWithDetails.info(
                      `Programa ya existe: ${programa.title}`
                    );
                  }
                  processedCount++;
                } else {
                  invalidDateCount++;
                  logWithDetails.warn(
                    `Fecha inválida para el programa: ${programa.title} (${programa.dateText})`
                  );
                }
              } else {
                invalidDateCount++;
                logWithDetails.warn(
                  `Fecha no encontrada para el programa: ${programa.title}`
                );
              }
            } catch (error) {
              errorCount++;
              logWithDetails.error(
                `Error procesando programa: ${programa.title}`,
                {
                  error: error.message,
                  stack: error.stack,
                  programaData: programa,
                }
              );
            }
          })
        );

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${programas.length} programas procesados`
        );
      }

      return {
        total: programas.length,
        processed: processedCount,
        saved: savedCount,
        errors: errorCount,
        invalidDates: invalidDateCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de programas UBA completado", {
      totalProgramas: result.total,
      programasProcesados: result.processed,
      programasGuardados: result.saved,
      errores: result.errors,
      fechasInvalidas: result.invalidDates,
    });

    return result;
  } catch (error) {
    logWithDetails.error(
      `Error crítico en scrapeUBAProgramas: ${error.stack}`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeFeesData = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de fees PJN");

      await page.goto(process.env.FEES_PAGE, {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      // Extraer datos de la tabla
      const rows = await page.evaluate(() => {
        const tableRows = document.querySelectorAll("table tbody tr");
        const data = [];

        tableRows.forEach((row) => {
          try {
            const columns = row.querySelectorAll("td");
            if (columns.length === 5) {
              const [
                resolucionCol,
                fechaCol,
                montoCol,
                periodoCol,
                vigenciaCol,
              ] = [...columns];

              data.push({
                resolucion: resolucionCol.innerText.trim(),
                fecha: fechaCol.innerText.trim(),
                monto: montoCol.innerText.trim().replace(".", ""),
                periodo: periodoCol.innerText.trim(),
                vigencia: vigenciaCol.innerText.trim(),
                type: "UMA PJN Ley 27.423",
                organization: "Poder Judicial de la Nación",
              });
            }
          } catch (error) {
            console.error("Error procesando fila:", error);
          }
        });

        return data;
      });

      logWithDetails.info(
        `Se encontraron ${rows.length} registros de fees para procesar`
      );

      // Procesar datos en lotes
      const BATCH_SIZE = 10;
      let processedCount = 0;
      let validCount = 0;
      let invalidCount = 0;
      const processedData = [];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        batch.forEach((row) => {
          try {
            const fechaParsed = moment(row.fecha, "DD/MM/YYYY");
            const vigenciaParsed = moment(row.vigencia, "DD/MM/YYYY");
            const montoParsed = parseFloat(
              row.monto.replace(/[^0-9,.-]+/g, "").replace(",", ".")
            );

            if (
              fechaParsed.isValid() &&
              vigenciaParsed.isValid() &&
              !isNaN(montoParsed)
            ) {
              processedData.push({
                ...row,
                fecha: fechaParsed.toDate(),
                vigencia: vigenciaParsed.toDate(),
                monto: montoParsed,
              });
              validCount++;
            } else {
              invalidCount++;
              logWithDetails.warn(`Datos inválidos en registro:`, {
                resolucion: row.resolucion,
                fecha: row.fecha,
                vigencia: row.vigencia,
                monto: row.monto,
              });
            }
            processedCount++;
          } catch (error) {
            invalidCount++;
            logWithDetails.error(`Error procesando registro:`, {
              error: error.message,
              data: row,
            });
          }
        });

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${rows.length} registros procesados`
        );
      }

      if (processedData.length > 0) {
        await saveFeesValuesAfterLastVigencia(processedData);
        logWithDetails.info(
          `Guardados ${processedData.length} registros de fees`
        );
      }

      return {
        total: rows.length,
        processed: processedCount,
        valid: validCount,
        invalid: invalidCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de fees PJN completado", {
      totalRegistros: result.total,
      registrosProcesados: result.processed,
      registrosValidos: result.valid,
      registrosInvalidos: result.invalid,
    });

    return result;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeFeesData: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeFeesDataCABA = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de fees CABA");

      await page.goto(process.env.FEES_PAGE_2, {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      // Extraer datos de la tabla
      const rows = await page.evaluate(() => {
        const tableRows = document.querySelectorAll("table tbody tr");
        const data = [];

        tableRows.forEach((row) => {
          try {
            const columns = row.querySelectorAll("td");
            if (columns.length === 5) {
              const [
                resolucionCol,
                fechaCol,
                montoCol,
                periodoCol,
                vigenciaCol,
              ] = [...columns];

              data.push({
                resolucion: resolucionCol.innerText.trim(),
                fecha: fechaCol.innerText.trim(),
                monto: montoCol.innerText.trim().replace(".", ""),
                periodo: periodoCol.innerText.trim(),
                vigencia: vigenciaCol.innerText.trim(),
                type: "UMA PJ CABA Ley 5.134",
                organization: "Poder Judicial de la Ciudad de Buenos Aires",
              });
            }
          } catch (error) {
            console.error("Error procesando fila:", error);
          }
        });

        return data;
      });

      logWithDetails.info(
        `Se encontraron ${rows.length} registros de fees CABA para procesar`
      );

      // Procesar datos en lotes
      const BATCH_SIZE = 10;
      let processedCount = 0;
      let validCount = 0;
      let invalidCount = 0;
      const processedData = [];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        batch.forEach((row) => {
          try {
            const parsedFecha = moment(row.fecha, "DD/MM/YYYY");
            const parsedVigencia = moment(row.vigencia, "DD/MM/YYYY");
            const montoParsed = parseFloat(
              row.monto.replace(/[^0-9,.-]+/g, "").replace(",", ".")
            );

            if (
              (parsedFecha.isValid() || !row.fecha) &&
              (parsedVigencia.isValid() || !row.vigencia) &&
              !isNaN(montoParsed)
            ) {
              processedData.push({
                ...row,
                fecha: parsedFecha.isValid() ? parsedFecha.toDate() : null,
                vigencia: parsedVigencia.isValid()
                  ? parsedVigencia.toDate()
                  : null,
                monto: montoParsed,
              });
              validCount++;
            } else {
              invalidCount++;
              logWithDetails.warn(`Datos inválidos en registro CABA:`, {
                resolucion: row.resolucion,
                fecha: row.fecha,
                vigencia: row.vigencia,
                monto: row.monto,
              });
            }
            processedCount++;
          } catch (error) {
            invalidCount++;
            logWithDetails.error(`Error procesando registro CABA:`, {
              error: error.message,
              data: row,
            });
          }
        });

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${rows.length} registros procesados`
        );
      }

      if (processedData.length > 0) {
        await saveFeesValuesAfterLastVigenciaCaba(processedData);
        logWithDetails.info(
          `Guardados ${processedData.length} registros de fees CABA`
        );
      }

      return {
        total: rows.length,
        processed: processedCount,
        valid: validCount,
        invalid: invalidCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de fees CABA completado", {
      totalRegistros: result.total,
      registrosProcesados: result.processed,
      registrosValidos: result.valid,
      registrosInvalidos: result.invalid,
    });

    return result;
  } catch (error) {
    logWithDetails.error(
      `Error crítico en scrapeFeesDataCABA: ${error.stack}`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeFeesDataBsAs = async () => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de fees Buenos Aires");

      await page.goto(process.env.FEES_PAGE_4, {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      // Esperar a que la tabla esté presente
      await page.waitForSelector("table", {
        timeout: defaultPuppeteerConfig.timeout,
      });

      // Extraer datos de la tabla
      const tableData = await page.evaluate(() => {
        try {
          const rows = Array.from(document.querySelectorAll("table tr"));
          return rows.map((row) => {
            const cells = Array.from(row.querySelectorAll("th, td"));
            return cells.map((cell) => cell.innerText.trim());
          });
        } catch (error) {
          console.error("Error extrayendo datos de tabla:", error);
          return [];
        }
      });

      logWithDetails.info(
        `Se encontraron ${tableData.length} filas en la tabla`
      );

      // Filtrar y procesar datos
      const filteredData = tableData
        .map((row) => row.filter((cell) => cell !== ""))
        .filter((row) => row.length > 0);

      // Unificar datos
      const unifiedData = [];
      let processedCount = 0;
      let validCount = 0;
      let invalidCount = 0;

      // Procesar en lotes
      const BATCH_SIZE = 10;
      for (let i = 1; i < filteredData.length; i++) {
        const row = filteredData[i];

        try {
          if (row[0]) {
            const parsedFirst = parseDateAndMonto(row[0], filteredData[0][0]);
            if (parsedFirst) {
              unifiedData.push(parsedFirst);
              validCount++;
            } else {
              invalidCount++;
            }
          }

          if (row[1]) {
            const parsedSecond = parseDateAndMonto(row[1], filteredData[0][1]);
            if (parsedSecond) {
              unifiedData.push(parsedSecond);
              validCount++;
            } else {
              invalidCount++;
            }
          }

          processedCount += 2; // Contamos ambas columnas

          // Limpiar memoria cada cierto número de registros
          if (processedCount % BATCH_SIZE === 0) {
            cleanupMemory();
            logWithDetails.info(
              `Progreso: ${processedCount} registros procesados`
            );
          }
        } catch (error) {
          invalidCount++;
          logWithDetails.error(`Error procesando fila ${i}:`, {
            error: error.message,
            data: row,
          });
        }
      }

      // Procesar y agrupar datos
      const groupedData = unifiedData.map((item) => {
        let newType = "";
        if (item.type.includes("14.967") || item.type.includes("14967")) {
          newType = "JUS Ley Nº 14.967";
        } else if (
          item.type.includes("8904/77") ||
          item.type.includes("8904-77") ||
          item.type.includes("8904")
        ) {
          newType = "JUS Dec-Ley Nº 8904/77";
        }

        return {
          ...item,
          type: newType,
          organization: "Poder Judicial de la provincia de Buenos Aires",
          periodo: formatPeriod(item.vigencia),
        };
      });

      if (groupedData.length > 0) {
        await saveNewFeesBA(groupedData);
        logWithDetails.info(
          `Guardados ${groupedData.length} registros de fees BA`
        );
      }

      return {
        total: processedCount,
        valid: validCount,
        invalid: invalidCount,
        saved: groupedData.length,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de fees BA completado", {
      totalRegistros: result.total,
      registrosValidos: result.valid,
      registrosInvalidos: result.invalid,
      registrosGuardados: result.saved,
    });

    return result;
  } catch (error) {
    logWithDetails.error(
      `Error crítico en scrapeFeesDataBsAs: ${error.stack}`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeLegalPage = async (urlPage, include, alternatives, type) => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info(`Iniciando scraping legal de ${type}`);

      await page.goto(urlPage, {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      // Extraer datos de la tabla
      const resultados = await page.evaluate(
        (include, alternatives) => {
          try {
            const filas = Array.from(
              document.querySelectorAll("table tbody tr")
            );
            const resultados = [];

            filas.forEach((fila) => {
              try {
                const celdas = fila.querySelectorAll("td");
                if (celdas.length === 3) {
                  const [normaCell, fechaCell, descripcionCell] = [...celdas];
                  const linkElement = normaCell.querySelector("a");

                  let descripcion = descripcionCell.innerText
                    .trim()
                    .replace(/\n/g, " - ");
                  let fecha = fechaCell.innerText.trim();
                  let link = linkElement?.getAttribute("href") || null;
                  const norma = linkElement?.innerText.trim() || null;

                  if (link) {
                    link = new URL(link, window.location.origin).href;
                    link = link.replace(/;jsessionid=[^?]+/i, "");
                  }

                  const contienePrincipal = descripcion.includes(include);
                  const contieneAlternativo = alternatives.some((keyword) =>
                    descripcion.includes(keyword)
                  );

                  if (contienePrincipal && contieneAlternativo) {
                    resultados.push({
                      fecha,
                      descripcion,
                      link,
                      norma,
                    });
                  }
                }
              } catch (error) {
                console.error("Error procesando fila:", error);
              }
            });
            return resultados;
          } catch (error) {
            console.error("Error en evaluación:", error);
            return [];
          }
        },
        include,
        alternatives
      );

      logWithDetails.info(
        `Se encontraron ${resultados.length} resultados para procesar`
      );

      // Procesar resultados en lotes
      const BATCH_SIZE = 10;
      let processedCount = 0;
      let validCount = 0;
      let invalidCount = 0;
      const processedResults = [];

      for (let i = 0; i < resultados.length; i += BATCH_SIZE) {
        const batch = resultados.slice(i, i + BATCH_SIZE);

        batch.forEach((resultado) => {
          try {
            const fechaISO = moment(resultado.fecha, "DD-MMM-YYYY", "es");

            if (fechaISO.isValid()) {
              processedResults.push({
                ...resultado,
                fecha: fechaISO.format("YYYY-MM-DD"),
                type,
              });
              validCount++;
            } else {
              invalidCount++;
              logWithDetails.warn(`Fecha inválida en resultado:`, {
                fecha: resultado.fecha,
                norma: resultado.norma,
              });
            }
            processedCount++;
          } catch (error) {
            invalidCount++;
            logWithDetails.error(`Error procesando resultado:`, {
              error: error.message,
              data: resultado,
            });
          }
        });

        // Limpiar memoria después de cada lote
        cleanupMemory();

        logWithDetails.info(
          `Progreso: ${processedCount}/${resultados.length} resultados procesados`
        );
      }

      return {
        data: processedResults,
        total: resultados.length,
        processed: processedCount,
        valid: validCount,
        invalid: invalidCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info(`Scraping legal de ${type} completado`, {
      totalResultados: result.total,
      resultadosProcesados: result.processed,
      resultadosValidos: result.valid,
      resultadosInvalidos: result.invalid,
    });

    return result.data;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeLegalPage: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
      type,
      url: urlPage,
    });
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapePrevisionalLink = async (link) => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");
    await page.setViewport({ width: 1280, height: 800 });

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping previsional");

      await page.goto(link, {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      // Esperar y hacer clic en el enlace del texto completo
      await page.waitForSelector("a");
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a"));
        const targetLink = links.find(
          (link) => link.textContent.trim() === "Texto completo de la norma"
        );
        if (targetLink) {
          targetLink.click();
        }
      });

      await page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });
      await page.waitForSelector("body");

      // Obtener y procesar artículos
      const html = await page.content();
      const articles = [];
      const regex = /ARTÍCULO\s+\d+.*?(?=<br\s*\/?>|$)/gs;
      let match;

      while ((match = regex.exec(html)) !== null) {
        const cleanedText = match[0]
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/\n/g, " ")
          .replace(/<[^>]*>/g, "")
          .trim();
        articles.push(cleanedText);
      }

      if (articles.length === 0) {
        logWithDetails.warn("No se encontraron artículos en el documento");
        return { data: [], articlesFound: 0 };
      }

      logWithDetails.info(
        `Se encontraron ${articles.length} artículos para procesar`
      );

      // Procesar artículos en lotes
      const BATCH_SIZE = 5;
      let processedCount = 0;
      let validCount = 0;
      const extractedData = [];

      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);

        batch.forEach((article, idx) => {
          try {
            const tipoMatch = article.match(
              /haber mínimo|haber máximo|prestación básica universal|pensión universal para el adulto mayor/i
            );

            if (tipoMatch) {
              const tipo = tipoMatch[0]
                .split(" ")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(" ");

              const fechaMatch = article.match(
                /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}/i
              );
              const importeMatch = article.match(
                /\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/
              );

              extractedData.push({
                tipo,
                fecha: fechaMatch ? fechaMatch[0] : "No especificada",
                importe: importeMatch ? importeMatch[0] : "No especificado",
                order: i + idx + 1,
              });
              validCount++;
            }
            processedCount++;
          } catch (error) {
            logWithDetails.error(`Error procesando artículo:`, {
              error: error.message,
              article,
            });
          }
        });

        // Limpiar memoria después de cada lote
        cleanupMemory();
      }

      // Buscar datos de movilidad
      const mobilityData = await page.evaluate(() => {
        const paragraphs = Array.from(
          document.querySelectorAll("p, div, span")
        );
        const mobilityParagraph = paragraphs.find((p) => {
          const text = p.textContent;
          return text.includes("movilidad") && /\d+[.,]\d+\s?%/.test(text);
        });

        if (mobilityParagraph) {
          const percentageMatch =
            mobilityParagraph.textContent.match(/\d+[.,]\d+\s?%/);
          return percentageMatch
            ? {
                tipo: "Aumento General",
                importe: percentageMatch[0],
                order: 0,
              }
            : null;
        }
        return null;
      });

      if (mobilityData && mobilityData.importe && extractedData.length > 0) {
        mobilityData.fecha = extractedData[0].fecha;
        extractedData.push(mobilityData);
      }

      const sortedData = extractedData.sort((a, b) => a.order - b.order);

      return {
        data: sortedData,
        articlesFound: articles.length,
        processed: processedCount,
        valid: validCount,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping previsional completado", {
      articulosEncontrados: result.articlesFound,
      articulosProcesados: result.processed,
      articulosValidos: result.valid,
      datosExtraidos: result.data.length,
    });

    return result.data;
  } catch (error) {
    logWithDetails.error(
      `Error crítico en scrapePrevisionalLink: ${error.stack}`,
      {
        error: error.message,
        stack: error.stack,
        link,
      }
    );
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

const scrapeDomesticos = async (urlPage, fechaInicio) => {
  let browser;
  try {
    logWithDetails.info("Esperando inicialización del pool...");
    await waitForInitialization();
    logWithDetails.info("Pool inicializado correctamente");

    logWithDetails.info("Intentando adquirir navegador del pool...");
    browser = await browserPool.acquire();

    if (!browser || !browser.isConnected()) {
      throw new Error("Navegador inválido o desconectado");
    }

    logWithDetails.info("Navegador adquirido exitosamente");

    const page = await browser.newPage();
    logWithDetails.info("Nueva página creada");

    const scrapeOperation = async () => {
      logWithDetails.info("Iniciando scraping de servicio doméstico");

      await page.goto(urlPage, {
        waitUntil: "networkidle2",
        timeout: defaultPuppeteerConfig.timeout,
      });

      const fechaInicioMoment = moment(fechaInicio).startOf("day");

      // Extraer información de las tablas
      const data = await page.evaluate((monthNames) => {
        const resultados = [];
        const warnings = [];
        const tables = document.querySelectorAll("table");

        tables.forEach((table, tableIndex) => {
          try {
            // Obtener fecha de la tabla
            let fechaElement = table.previousElementSibling;
            while (fechaElement && !fechaElement.matches("h3, h4, h5")) {
              fechaElement = fechaElement.previousElementSibling;
            }
            let fecha = fechaElement?.innerText.trim() || "Fecha no encontrada";

            if (fecha === "Fecha no encontrada") {
              warnings.push(
                `Advertencia: No se encontró la fecha para la tabla ${
                  tableIndex + 1
                }`
              );
              return;
            }

            // Procesar fecha
            const fechaMatch = fecha.match(
              /(?:A PARTIR DEL|a partir del)\s+(\d{1,2})[°º]?\s+de\s+([A-ZÁÉÍÓÚa-záéíóú]+)\s+de\s+(\d{4})/i
            );

            if (fechaMatch) {
              const [, day, monthStr, year] = fechaMatch;
              const month =
                monthNames[monthStr.toUpperCase()] ||
                monthNames[monthStr.toLowerCase()];

              if (day && month && year) {
                const dateObj = new Date(
                  Date.UTC(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    12,
                    0,
                    0
                  )
                );

                if (!isNaN(dateObj)) {
                  fecha = dateObj.toISOString();
                } else {
                  warnings.push(
                    `Advertencia: Fecha inválida en tabla ${
                      tableIndex + 1
                    }: ${fecha}`
                  );
                  return;
                }
              }
            }

            // Procesar filas de la tabla
            const rows = table.querySelectorAll("tbody tr");
            rows.forEach((row) => {
              const cells = row.querySelectorAll("td");
              if (cells.length >= 2) {
                try {
                  let categoria = cells[0].innerText.trim();
                  const categoriaMatch = categoria.match(
                    /SUPERVISOR|PERSONAL PARA TAREAS ESPECIFICAS|PERSONAL PARA TAREAS ESPECÍFICAS|CASEROS|ASISTENCIA Y CUIDADO DE PERSONAS|PERSONAL PARA TAREAS GENERALES/i
                  );
                  categoria = categoriaMatch ? categoriaMatch[0] : categoria;

                  const procesarValores = (text) => {
                    const valorHoraMatch = text.match(/Hora:? \$([\d.,]+)/);
                    const valorMensualMatch = text.match(
                      /Mensual:? \$([\d.,]+)/
                    );

                    if (valorHoraMatch && valorMensualMatch) {
                      return {
                        valorHora: parseFloat(
                          valorHoraMatch[1].replace(/[.,]/g, (m) =>
                            m === "." ? "" : "."
                          )
                        ),
                        valorMensual: parseFloat(
                          valorMensualMatch[1].replace(/[.,]/g, (m) =>
                            m === "." ? "" : "."
                          )
                        ),
                      };
                    }
                    return null;
                  };

                  if (cells.length === 3) {
                    const conRetiroValues = procesarValores(cells[1].innerText);
                    if (conRetiroValues) {
                      resultados.push({
                        fecha,
                        categoria,
                        tipo: "CON RETIRO",
                        ...conRetiroValues,
                      });
                    }

                    const sinRetiroValues = procesarValores(cells[2].innerText);
                    if (sinRetiroValues) {
                      resultados.push({
                        fecha,
                        categoria,
                        tipo: "SIN RETIRO",
                        ...sinRetiroValues,
                      });
                    }
                  } else if (cells.length === 2) {
                    const valores = procesarValores(cells[1].innerText);
                    if (valores) {
                      resultados.push({
                        fecha,
                        categoria,
                        tipo: "SIN RETIRO",
                        ...valores,
                      });
                    }
                  }
                } catch (error) {
                  console.error(
                    `Error procesando fila en tabla ${tableIndex + 1}:`,
                    error
                  );
                }
              }
            });
          } catch (error) {
            console.error(`Error procesando tabla ${tableIndex + 1}:`, error);
          }
        });

        return { resultados, warnings };
      }, monthNames);

      // Procesar advertencias y resultados
      data.warnings.forEach((warning) => {
        logWithDetails.warn(warning);
      });

      const filteredResults = fechaInicio
        ? data.resultados.filter(({ fecha }) =>
            moment(fecha).isAfter(fechaInicioMoment, "day")
          )
        : data.resultados;

      return {
        data: filteredResults,
        total: data.resultados.length,
        filtered: filteredResults.length,
        warnings: data.warnings.length,
      };
    };

    // Ejecutar operación con reintentos
    const result = await retryOperation(scrapeOperation);

    logWithDetails.info("Scraping de servicio doméstico completado", {
      totalRegistros: result.total,
      registrosFiltrados: result.filtered,
      advertencias: result.warnings,
    });

    return result.data;
  } catch (error) {
    logWithDetails.error(`Error crítico en scrapeDomesticos: ${error.stack}`, {
      error: error.message,
      stack: error.stack,
      url: urlPage,
    });
    throw error;
  } finally {
    if (browser) {
      await browserPool.release(browser);
    }
  }
};

module.exports = {
  scrapeNoticias,
  scrapeInfojus,
  scrapeElDial,
  scrapeHammurabi,
  scrapeSaij,
  scrapeGPCourses,
  scrapeDiplomados,
  scrapeUBATalleres,
  scrapeUBAProgramas,
  scrapeFeesData,
  scrapeFeesDataCABA,
  scrapeFeesDataBsAs,
  scrapeLegalPage,
  scrapePrevisionalLink,
  scrapeDomesticos,
};
