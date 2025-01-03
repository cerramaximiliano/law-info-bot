const puppeteer = require("puppeteer");
const News = require("../models/news");
const Acts = require("../models/acts");
const FeesModel = require("../models/feesValues");
const Courses = require("../models/courses");
const { saveNewNews } = require("../controllers/notiicasControllers");
const hashStringToNumber = require("../utils/formatId");
const { logger } = require("../config/logger");
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

const scrapeNoticias = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

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

  // Cierra el navegador
  await browser.close();

  return savedNews;
};

const scrapeInfojus = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Navega al sitio web
  await page.goto("http://www.infojusnoticias.gov.ar/", {
    waitUntil: "load",
    timeout: 0,
  });

  // Extraer los artículos de la página
  const articles = await page.evaluate(() => {
    // Selecciona todos los elementos <article> con la clase "principal"
    const elements = document.querySelectorAll("article");
    const results = [];

    elements.forEach((element) => {
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
    });

    return results;
  });

  // Itera sobre los artículos y guárdalos en la base de datos
  for (const article of articles) {
    try {
      // Verifica si el artículo ya existe
      const exists = await News.findOne({ id: article.id });
      if (!exists) {
        // Si no existe, lo guarda en la base de datos
        const newsItem = new News(article);
        await newsItem.save();
        logger.info(`Artículo guardado: ${article.title}`);
      } else {
        logger.info(`Artículo : ${article.title}`);
      }
    } catch (error) {
      logger.error(`Error guardando artículo: ${article.title}`, error);
    }
  }

  // Cierra el navegador
  await browser.close();
};

const scrapeElDial = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Navega al sitio web
  await page.goto("https://www.eldial.com/nuevo/nuevo_diseno/v2/index.asp", {
    waitUntil: "load",
    timeout: 0,
  });

  // Extraer los artículos de la página
  const articles = await page.evaluate(() => {
    // Selecciona todos los elementos <li>
    const elements = document.querySelectorAll("li");
    const results = [];

    elements.forEach((element) => {
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
    });

    return results;
  });

  // Itera sobre los artículos y guárdalos en la base de datos
  for (const article of articles) {
    try {
      // Verifica si el artículo ya existe
      const exists = await News.findOne({ id: article.id });
      if (!exists) {
        // Si no existe, lo guarda en la base de datos
        const newsItem = new News(article);
        await newsItem.save();
        logger.info(`Artículo guardado: ${article.title}`);
      } else {
        logger.info(`Artículo ya existe: ${article.title}`);
      }
    } catch (error) {
      logger.error(`Error guardando artículo: ${article.title}`, error);
    }
  }

  // Cierra el navegador
  await browser.close();
};

const scrapeHammurabi = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.goto(
    "https://www.hammurabi.com.ar/noticias-juridicas-de-la-semana/",
    { waitUntil: "load", timeout: 0 }
  );

  const articles = await page.evaluate(() => {
    const elements = document.querySelectorAll("li");
    const results = [];

    elements.forEach((element) => {
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
            idText, // Guardamos el texto del id para luego convertirlo en hash
            siteId: "hammurabi",
          });
        }
      }
    });

    return results;
  });

  for (const article of articles) {
    try {
      const articleId = hashStringToNumber(article.idText); // Convertimos el id a número usando la función hash
      const exists = await News.findOne({ id: articleId });
      if (!exists) {
        const newsItem = new News({
          href: article.href,
          title: article.title,
          text: article.text,
          id: articleId, // Usamos el ID generado
          siteId: article.siteId,
        });
        await newsItem.save();
        logger.info(`Artículo guardado: ${article.title}`);
      } else {
        logger.info(`Artículo ya existe: ${article.title}`);
      }
    } catch (error) {
      logger.error(`Error guardando artículo: ${article.title}`, error);
    }
  }

  await browser.close();
};

const scrapeSaij = async () => {
  try {
    const url = "http://www.saij.gob.ar/boletin-diario/";
    const browser = await puppeteer.launch({
      headless: true,
      timeout: 60000, // Ajusta el tiempo de espera si es necesario
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });

    const newsItems = await page.evaluate(() => {
      const items = [];
      const idPatternDN = /DN(\d+)/; // Regex para extraer el id del formato DN
      const urlPattern = /id=(\d+)/; // Regex para extraer el id del parámetro de la URL

      document.querySelectorAll(".detalle").forEach((detalle) => {
        const href = detalle.querySelector(".titulo-norma a")?.href || "";
        const titleElement = detalle.querySelector(".titulo-norma a");
        const title = titleElement
          ? titleElement.textContent.trim() +
            " (" +
            (detalle.querySelector(".subtitulo-norma")?.textContent.trim() ||
              "") +
            ")"
          : "";
        const text =
          detalle.querySelector(".sintesis")?.textContent.trim() || "";

        // Intentar extraer el id usando ambos patrones
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
      });
      return items;
    });

    logger.info(`Cantidad de normas extraídas: ${newsItems.length}`);

    for (const item of newsItems) {
      const existingNews = await Acts.findOne({ id: item.id });
      if (!existingNews) {
        const newsItem = new Acts({
          ...item,
          siteId: "saij",
          notifiedByTelegram: false,
          notificationDate: null,
        });
        try {
          await newsItem.save();
          logger.info(`Norma guardada: ${newsItem.title}`);
        } catch (error) {
          logger.error(`Error al guardar la norma: ${error.message}`);
        }
      } else {
        logger.info(`Norma ya existe: ${item.title}`);
      }
    }

    await browser.close();
  } catch (err) {
    logger.error("Error web scraping SAIJ", err);
  }
};

const scrapeGPCourses = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Navegar a la página de cursos
    await page.goto(
      "https://www.grupoprofessional.com.ar/cursos/cursos-streaming",
      {
        waitUntil: "networkidle2",
      }
    );

    // Extraer la información de los cursos
    const cursos = await page.evaluate(() => {
      const cursosElements = document.querySelectorAll(".card-block");
      const cursosData = [];

      cursosElements.forEach((cursoElement) => {
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
      });

      return cursosData;
    });

    for (let curso of cursos) {
      await page.goto(curso.link, { waitUntil: "networkidle2" });

      const additionalData = await page.evaluate(() => {
        const priceElement = document.querySelector(".precio-curso");
        const typeElement = document
          .querySelector(".fa-video")
          ?.parentElement?.textContent.trim();

        const price = priceElement
          ? priceElement.textContent.replace(/[^0-9]/g, "") + " ARS"
          : "No disponible";
        const type = typeElement || "No disponible";

        return { price, type };
      });

      const parsedDate = parseDate(curso.date);

      if (parsedDate) {
        // Verificar si ya existe un curso con el mismo título y fecha
        const existingCourse = await Courses.findOne({
          title: curso.title,
          date: parsedDate,
        });

        if (!existingCourse) {
          // Si no existe, crear un nuevo registro
          const nuevoCurso = new Courses({
            title: curso.title,
            date: parsedDate,
            link: curso.link,
            price: additionalData.price,
            type: additionalData.type,
            siteId: "Grupo Profesional",
          });
          await nuevoCurso.save();
          logger.info(`Curso guardado: ${curso.title}`);
        } else {
          logger.info(`Curso ya existe: ${curso.title}. No se guardará.`);
        }
      } else {
        logger.info(
          `Fecha inválida para el curso: ${curso.title}. No se guardará.`
        );
      }
    }

    await browser.close();
  } catch (error) {
    logger.error("Error durante el scraping:", error);
  }
};

const scrapeDiplomados = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Navegar a la página de diplomados de derecho
    await page.goto(
      "https://www.grupoprofessional.com.ar/diplomados-derecho/",
      {
        waitUntil: "networkidle2",
      }
    );

    // Extraer la información de los diplomados
    const diplomados = await page.evaluate(() => {
      const diplomadosElements = document.querySelectorAll(
        ".col-md-4.card-diplomado-individual"
      );
      const diplomadosData = [];

      diplomadosElements.forEach((diplomadoElement) => {
        const titleElement = diplomadoElement.querySelector(".card-title a");
        const linkElement = diplomadoElement.querySelector(".card-title a");

        const title = titleElement?.textContent.trim();
        const link = linkElement?.href;

        if (title && link) {
          diplomadosData.push({
            title,
            link,
          });
        }
      });

      return diplomadosData;
    });

    // Iterar sobre cada diplomado para extraer datos adicionales y guardar en la base de datos
    for (let diplomado of diplomados) {
      await page.goto(diplomado.link, { waitUntil: "networkidle2" });

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

        // Extraer el precio del curso si existe

        const priceElement = document.querySelector(".datos-precio h3");
        const priceText = priceElement
          ? priceElement.childNodes[0].textContent.trim()
          : null;

        // Extraer solo la parte relevante de las cadenas de texto
        const date = dateElement
          ? dateElement.replace("Fecha de inicio:", "").trim()
          : null;
        const type = typeElement
          ? typeElement.replace("Modalidad  de cursada:", "").trim()
          : "Modalidad no disponible";
        const price = priceText
          ? formatPrice(priceText)
          : "Precio no disponible";

        return { date, type, price };
      });

      // Parsear la fecha a formato Date usando moment.js
      diplomado.date = additionalData.date
        ? parseDateFormat(additionalData.date)
        : null;
      diplomado.type = additionalData.type;
      diplomado.price = additionalData.price;

      // Verificar si ya existe un curso con el mismo título y fecha
      const existingCourse = await Courses.findOne({
        title: diplomado.title,
        date: diplomado.date,
      });

      if (!existingCourse) {
        // Si no existe, crear un nuevo registro
        const nuevoCurso = new Courses({
          title: diplomado.title,
          date: diplomado.date,
          link: diplomado.link,
          price: diplomado.price,
          type: diplomado.type,
          siteId: "Grupo Profesional",
        });
        await nuevoCurso.save();
        logger.info(`Curso guardado: ${diplomado.title}`);
      } else {
        logger.info(`Curso ya existe: ${diplomado.title}. No se guardará.`);
      }
    }

    await browser.close();
  } catch (error) {
    logger.error(error);
    logger.error("Error durante el scraping:", error);
  }
};

const scrapeUBATalleres = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Navegar a la página de talleres
    await page.goto("http://www.derecho.uba.ar/graduados/talleres/", {
      waitUntil: "networkidle2",
    });

    // Extraer la información de los talleres
    const talleres = await page.evaluate(() => {
      const talleresElements = document.querySelectorAll(".modulo");
      const talleresData = [];

      talleresElements.forEach((tallerElement) => {
        const titleElement = tallerElement.querySelector("h3 a");
        const title = titleElement?.textContent.replace(/^\d+\.\s*/, "").trim(); // Eliminar la numeración
        const link = titleElement?.href;
        const typeElement = tallerElement.querySelector("span.badge");
        const type = typeElement?.textContent.trim();

        // Extraer el texto que contiene la fecha
        const contenidoElement = tallerElement.querySelector(".contenido p");
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
            dateText, // Pasamos la fecha como texto para procesarla fuera de evaluate
            type,
            siteId: "UBA Derecho",
          });
        }
      });

      return talleresData;
    });

    // Procesar la fecha usando moment fuera de evaluate y guardar los cursos
    for (let taller of talleres) {
      if (taller.dateText) {
        let dateText = taller.dateText;
        if (!/\d{4}/.test(dateText)) {
          dateText += ` de ${new Date().getFullYear()}`;
        }
        taller.date = moment(dateText, "DD [de] MMMM [de] YYYY", "es").toDate();
        delete taller.dateText; // Eliminar el campo dateText ya que ahora tenemos el campo date

        // Verificar si ya existe un curso con el mismo título y fecha
        const existingCourse = await Courses.findOne({
          title: taller.title,
          date: taller.date,
        });

        if (!existingCourse) {
          // Si no existe, crear un nuevo registro
          const nuevoCurso = new Courses({
            title: taller.title,
            date: taller.date,
            link: taller.link,
            type: taller.type,
            siteId: taller.siteId,
          });
          await nuevoCurso.save();
          logger.info(`Curso guardado: ${taller.title}`);
        } else {
          logger.info(`Curso ya existe: ${taller.title}. No se guardará.`);
        }
      }
    }

    await browser.close();
  } catch (error) {
    logger.error("Error durante el scraping:", error);
  }
};

const scrapeUBAProgramas = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Navegar a la página de programas de perfeccionamiento
    await page.goto(
      "http://www.derecho.uba.ar/graduados/programas-de-perfeccionamiento/",
      {
        waitUntil: "networkidle2",
      }
    );

    // Función para formatear el precio
    const formatPrice = (priceString) => {
      if (priceString === "Gratis") return "0 ARS";
      const numericPrice = priceString.replace(/[^\d,]/g, "").replace(",", ".");
      return `${parseFloat(numericPrice.replace(".", ""))} ARS`;
    };

    // Extraer la información de los programas
    const programas = await page.evaluate(() => {
      const programasElements = document.querySelectorAll(".modulo");
      const programasData = [];

      programasElements.forEach((programaElement) => {
        const titleElement = programaElement.querySelector("h3 a");
        let title = titleElement?.textContent.replace(/^\d+\.\s*/, "").trim(); // Eliminar la numeración

        // Eliminar el guion y los espacios al inicio si quedan
        title = title.replace(/^-+\s*/, "").trim();

        const link = titleElement?.href;
        const typeElement = programaElement.querySelector("span.badge");
        const type = typeElement?.textContent.trim();

        // Extraer la fecha de inicio
        const contenidoElement = programaElement.querySelector(".contenido p");
        let dateText = null;

        if (contenidoElement) {
          const regex = /(\d{2}-\d{2}-\d{4})/; // Expresión regular para capturar la fecha en formato "dd-mm-yyyy"
          const match = contenidoElement.textContent.match(regex);
          if (match) {
            dateText = match[0];
          }
        }

        // Extraer los precios
        let priceUBA = null;
        let priceOthers = null;

        if (contenidoElement) {
          const priceUBAMatch = contenidoElement.textContent.match(
            /Precio para graduadas\/os UBA: (Gratis|\$\d{1,3}(?:\.\d{3})*)/
          );
          const priceOthersMatch = contenidoElement.textContent.match(
            /Precio para graduadas\/os de otras universidades: (Gratis|\$\d{1,3}(?:\.\d{3})*)/
          );

          priceUBA = priceUBAMatch ? priceUBAMatch[1].trim() : "No disponible";
          priceOthers = priceOthersMatch
            ? priceOthersMatch[1].trim()
            : "No disponible";
        }

        if (title && link && type && dateText) {
          programasData.push({
            title,
            link,
            dateText, // Pasamos la fecha como texto para procesarla fuera de evaluate
            type,
            siteId: "UBA Derecho",
            priceUBA,
            priceOthers,
          });
        }
      });

      return programasData;
    });

    // Procesar la fecha y precios usando moment fuera de evaluate y guardar los programas
    for (let programa of programas) {
      if (programa.dateText) {
        programa.date = moment(programa.dateText, "DD-MM-YYYY").toDate();
        delete programa.dateText; // Eliminar el campo dateText ya que ahora tenemos el campo date

        // Formatear los precios
        programa.priceUBA = programa.priceUBA
          ? formatPrice(programa.priceUBA)
          : "No disponible";
        programa.priceOthers = programa.priceOthers
          ? formatPrice(programa.priceOthers)
          : "No disponible";

        // Verificar si ya existe un programa con el mismo título y fecha
        const existingCourse = await Courses.findOne({
          title: programa.title,
          date: programa.date,
        });

        if (!existingCourse) {
          // Si no existe, crear un nuevo registro
          const nuevoPrograma = new Courses({
            title: programa.title,
            date: programa.date,
            link: programa.link,
            type: programa.type,
            siteId: programa.siteId,
            priceUBA: programa.priceUBA,
            price: programa.priceOthers,
          });
          await nuevoPrograma.save();
          logger.info(`Programa guardado: ${programa.title}`);
        } else {
          logger.info(`Programa ya existe: ${programa.title}. No se guardará.`);
        }
      }
    }

    await browser.close();
  } catch (error) {
    logger.error("Error durante el scraping:", error);
  }
};

const scrapeFeesData = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    // Navegar a la página de programas de perfeccionamiento
    await page.goto(process.env.FEES_PAGE, {
      timeout: 90000, // 60 segundo
      waitUntil: "networkidle2",
    });

    const rows = await page.evaluate(() => {
      const tableRows = document.querySelectorAll("table tbody tr");
      const data = [];

      tableRows.forEach((row) => {
        const columns = row.querySelectorAll("td");
        if (columns.length === 5) {
          const fechaRaw = columns[1].innerText.trim();
          const vigenciaRaw = columns[4].innerText.trim();
          const montoRaw = columns[2].innerText.trim();
          const montoSinPunto = montoRaw.replace(".", "");

          // Aquí almacenamos las fechas y el monto en strings
          const resolucion = columns[0].innerText.trim();
          const fecha = fechaRaw; // Será procesada con Moment.js más adelante
          const monto = montoSinPunto; // Será procesada para convertirla en un número
          const periodo = columns[3].innerText.trim();
          const vigencia = vigenciaRaw; // Será procesada con Moment.js más adelante

          data.push({
            resolucion,
            fecha,
            monto,
            periodo,
            vigencia,
            type: "UMA PJN Ley 27.423",
            organization: "Poder Judicial de la Nación",
          });
        }
      });

      return data;
    });

    // Procesamos los datos para convertir fecha y vigencia con moment.js y monto a number
    const processedData = rows.map((row) => {
      return {
        ...row,
        fecha: moment(row.fecha, "DD/MM/YYYY").toDate(), // Conviertes la fecha usando el formato correcto
        vigencia: moment(row.vigencia, "DD/MM/YYYY").toDate(), // Conviertes la vigencia también
        monto: parseFloat(
          row.monto.replace(/[^0-9,.-]+/g, "").replace(",", ".")
        ), // Limpia y convierte el monto a número
      };
    });

    await saveFeesValuesAfterLastVigencia(processedData);
  } catch (err) {
    logger.error(`Error scraping fees data: ${err}`);
  }
};

const scrapeFeesDataCABA = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    // Navegar a la página de programas de perfeccionamiento
    await page.goto(process.env.FEES_PAGE_2, {
      timeout: 90000, // 60 segundo
      waitUntil: "networkidle2",
    });

    const rows = await page.evaluate(() => {
      const tableRows = document.querySelectorAll("table tbody tr");
      const data = [];

      tableRows.forEach((row) => {
        const columns = row.querySelectorAll("td");
        if (columns.length === 5) {
          const fechaRaw = columns[1].innerText.trim();
          const vigenciaRaw = columns[4].innerText.trim();
          const montoRaw = columns[2].innerText.trim();
          const montoSinPunto = montoRaw.replace(".", "");
          // Aquí almacenamos las fechas y el monto en strings
          const resolucion = columns[0].innerText.trim();
          const fecha = fechaRaw; // Será procesada con Moment.js más adelante
          const monto = montoSinPunto; // Será procesada para convertirla en un número
          const periodo = columns[3].innerText.trim();
          const vigencia = vigenciaRaw; // Será procesada con Moment.js más adelante

          data.push({
            resolucion,
            fecha,
            monto,
            periodo,
            vigencia,
            type: "UMA PJ CABA Ley 5.134",
            organization: "Poder Judicial de la Ciudad de Buenos Aires",
          });
        }
      });

      return data;
    });

    // Procesamos los datos para convertir fecha y vigencia con moment.js y monto a number
    const processedData = rows.map((row) => {
      const parsedFecha = moment(row.fecha, "DD/MM/YYYY");
      const parsedVigencia = moment(row.vigencia, "DD/MM/YYYY");

      return {
        ...row,
        fecha: parsedFecha.isValid() ? parsedFecha.toDate() : null, // Verifica si la fecha es válida, si no, asigna `null`
        vigencia: parsedVigencia.isValid() ? parsedVigencia.toDate() : null, // Verifica si la vigencia es válida, si no, asigna `null`
        monto: parseFloat(
          row.monto.replace(/[^0-9,.-]+/g, "").replace(",", ".")
        ), // Limpia y convierte el monto a número
      };
    });

    await saveFeesValuesAfterLastVigenciaCaba(processedData);
  } catch (err) {
    logger.error(`Error scraping fees data: ${err}`);
  }
};

const scrapeFeesDataBsAs = async () => {
  let browser;
  try {
    // Inicia el navegador
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();

    // Navega a la URL especificada
    await page.goto(process.env.FEES_PAGE_4, {
      waitUntil: "domcontentloaded",
    });

    // Espera a que la tabla esté presente en la página
    await page.waitForSelector("table");

    // Extrae los datos de la tabla
    const tableData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tr"));
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("th, td"));
        return cells.map((cell) => cell.innerText.trim());
      });
    });

    // Filtrar las filas vacías o incompletas y eliminar celdas vacías
    const filteredData = tableData
      .map((row) => row.filter((cell) => cell !== ""))
      .filter((row) => row.length > 0);
    // Unificar los datos y agregar la propiedad type
    const unifiedData = [];
    filteredData.slice(1).forEach((row) => {
      if (row[0]) {
        const parsedFirst = parseDateAndMonto(row[0], filteredData[0][0]);
        if (parsedFirst) unifiedData.push(parsedFirst);
      }
      if (row[1]) {
        const parsedSecond = parseDateAndMonto(row[1], filteredData[0][1]);
        if (parsedSecond) unifiedData.push(parsedSecond);
      }
    });

    // Group the data by 'type' and add additional properties
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
    }
    return groupedData;
  } catch (error) {
    logger.error("Error al realizar el scraping Fees BA:", error);
  } finally {
    // Cierra el navegador
    if (browser) {
      await browser.close();
    }
  }
};

const scrapeLegalPage = async (urlPage, include, alternatives, type) => {
  let browser;
  // Inicia el navegador
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    await page.goto(urlPage, {
      waitUntil: "domcontentloaded",
    });

    const resultados = await page.evaluate(
      (include, alternatives) => {
        const filas = Array.from(document.querySelectorAll("table tbody tr"));
        const resultados = [];

        filas.forEach((fila) => {
          const celdas = fila.querySelectorAll("td");
          if (celdas.length === 3) {
            let descripcion = celdas[2].innerText.trim().replace(/\n/g, " - ");
            let fecha = celdas[1].innerText.trim();
            const linkElement = celdas[0].querySelector("a");
            let link = linkElement ? linkElement.getAttribute("href") : null;
            const norma = linkElement ? linkElement.innerText.trim() : null;

            // Asegurarse de que el link sea absoluto y eliminar jsessionid
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
        });
        return resultados;
      },
      include,
      alternatives
    );

    // Convertir las fechas al formato ISO utilizando moment.js
    const resultadosConFechaISO = resultados.map((resultado) => {
      const fechaISO = moment(resultado.fecha, "DD-MMM-YYYY", "es").format(
        "YYYY-MM-DD"
      );
      return {
        ...resultado,
        fecha: fechaISO,
        type,
      };
    });
    return resultadosConFechaISO;
  } catch (error) {
    logger.error("Error al realizar el scraping legal:", error);
    throw Error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const scrapePrevisionalLink = async (link) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 }); // Ampliar la visión del navegador
    await page.goto(link, { waitUntil: "domcontentloaded" });
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
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("body"); // Asegurarse de que el contenido del cuerpo esté cargado

    // Obtener el contenido HTML completo
    const html = await page.content();

    // Usar una expresión regular para encontrar los textos que comienzan con 'ARTÍCULO'
    const articles = [];
    const regex = /ARTÍCULO\s+\d+.*?(?=<br\s*\/?>|$)/gs;
    let match;
    while ((match = regex.exec(html)) !== null) {
      // Limpiar el contenido HTML eliminando etiquetas y saltos de línea
      const cleanedText = match[0]
        .replace(/<br\s*\/?>/gi, " ") // Reemplazar <br> por espacio
        .replace(/\n/g, " ") // Reemplazar saltos de línea por espacio
        .replace(/<[^>]*>/g, "") // Eliminar cualquier otra etiqueta HTML
        .trim();
      articles.push(cleanedText);
    }

    // Verificar si se encuentran elementos con el contenido deseado
    if (articles.length === 0) {
      logger.error(
        "No se encontraron elementos que comiencen con 'ARTÍCULO'. Verificar la estructura del DOM."
      );
    }
    logger.info(articles);
    // Extraer los datos específicos de cada artículo
    const extractedData = articles
      .map((article, index) => {
        const tipoMatch = article.match(
          /haber mínimo|haber máximo|prestación básica universal|pensión universal para el adulto mayor/i
        );
        if (!tipoMatch) return null;

        let tipo = tipoMatch[0]
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ");
        const fechaMatch = article.match(
          /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}/i
        );
        const importeMatch = article.match(/\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/);

        return {
          tipo: tipo,
          fecha: fechaMatch ? fechaMatch[0] : "No especificada",
          importe: importeMatch ? importeMatch[0] : "No especificado",
          order: index + 1,
        };
      })
      .filter((data) => data !== null);

    // Buscar párrafos que contengan la palabra 'movilidad' y un porcentaje
    const mobilityData = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll("p, div, span"));
      const mobilityParagraph = paragraphs.find((p) => {
        const text = p.textContent;
        return text.includes("movilidad") && /\d+[.,]\d+\s?%/.test(text);
      });
      if (mobilityParagraph) {
        let percentageMatch =
          mobilityParagraph.textContent.match(/\d+[.,]\d+\s?%/);
        let result = percentageMatch ? percentageMatch[0] : null;
        return {
          tipo: "Aumento General",
          importe: result,
          order: 0,
        };
      }
      return null;
    });

    if (mobilityData && mobilityData.importe) {
      mobilityData.fecha = extractedData[0].fecha;
      extractedData.push(mobilityData);
    }
    const data = extractedData.sort((a, b) => a.order - b.order);
    return extractedData;
  } catch (error) {
    logger.error(`Error al obtener datos previsionales: ${error}`);
    throw new Error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const scrapeDomesticos = async (urlPage, fechaInicio) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    await page.goto(urlPage, {
      waitUntil: "domcontentloaded",
    });

    // Ajustar la fecha de inicio al inicio del día (hora cero)
    const fechaInicioMoment = moment(fechaInicio).startOf("day");

    // Extraer la información de cada tabla
    const data = await page.evaluate(() => {
      const resultados = [];
      const warnings = [];
      const tables = document.querySelectorAll("table");

      tables.forEach((table) => {
        let fechaElement = table.previousElementSibling;
        while (fechaElement && !fechaElement.matches("h3, h4, h5")) {
          fechaElement = fechaElement.previousElementSibling;
        }
        let fecha = fechaElement
          ? fechaElement.innerText.trim()
          : "Fecha no encontrada";
        if (fecha === "Fecha no encontrada") {
          warnings.push(
            `Advertencia: No se encontró la fecha para una de las tablas. Nodo HTML: ${table.outerHTML}`
          );
        }

        // Extraer solo la fecha (día, mes y año) del texto
        const fechaMatch = fecha.match(
          /(?:A PARTIR DEL|a partir del)\s+(\d{1,2})[°º]?\s+de\s+([A-ZÁÉÍÓÚa-záéíóú]+)\s+de\s+(\d{4})/i
        );

        if (fechaMatch) {
          const day = fechaMatch[1].padStart(2, "0");
          const monthNames = {
            ENERO: "01",
            FEBRERO: "02",
            MARZO: "03",
            ABRIL: "04",
            MAYO: "05",
            JUNIO: "06",
            JULIO: "07",
            AGOSTO: "08",
            SEPTIEMBRE: "09",
            SETIEMBRE: "09",
            OCTUBRE: "10",
            NOVIEMBRE: "11",
            DICIEMBRE: "12",
            enero: "01",
            febrero: "02",
            marzo: "03",
            abril: "04",
            mayo: "05",
            junio: "06",
            julio: "07",
            agosto: "08",
            septiembre: "09",
            setiembre: "09",
            octubre: "10",
            noviembre: "11",
            diciembre: "12",
          };

          const month =
            monthNames[fechaMatch[2].toUpperCase()] ||
            monthNames[fechaMatch[2].toLowerCase()];
          const year = fechaMatch[3];

          if (day && month && year) {
            const dateObj = new Date(
              Date.UTC(
                parseInt(year),
                parseInt(month) - 1, // Los meses en JavaScript son 0-based
                parseInt(day),
                12, // hora
                0, // minutos
                0 // segundos
              )
            );

            if (!isNaN(dateObj)) {
              fecha = dateObj.toISOString();
            } else {
              warnings.push(`Advertencia: Fecha inválida extraída: ${fecha}`);
            }
          }
        }

        const rows = table.querySelectorAll("tbody tr");
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 2) {
            let categoria = cells[0].innerText.trim();

            // Filtrar la categoría
            const categoriaMatch = categoria.match(
              /SUPERVISOR|PERSONAL PARA TAREAS ESPECIFICAS|PERSONAL PARA TAREAS ESPECÍFICAS|CASEROS|ASISTENCIA Y CUIDADO DE PERSONAS|PERSONAL PARA TAREAS GENERALES/i
            );
            categoria = categoriaMatch ? categoriaMatch[0] : categoria;

            if (cells.length === 3) {
              try {
                // Extraer datos para CON RETIRO
                const conRetiroText = cells[1].innerText;
                const valorHoraConRetiroMatch =
                  conRetiroText.match(/Hora:? \$([\d.,]+)/);
                const valorMensualConRetiroMatch = conRetiroText.match(
                  /Mensual:? \$([\d.,]+)/
                );

                if (valorHoraConRetiroMatch && valorMensualConRetiroMatch) {
                  const valorHoraConRetiro = parseFloat(
                    valorHoraConRetiroMatch[1].replace(/[.,]/g, (m) =>
                      m === "." ? "" : "."
                    )
                  );
                  const valorMensualConRetiro = parseFloat(
                    valorMensualConRetiroMatch[1].replace(/[.,]/g, (m) =>
                      m === "." ? "" : "."
                    )
                  );

                  resultados.push({
                    fecha,
                    categoria,
                    tipo: "CON RETIRO",
                    valorHora: valorHoraConRetiro,
                    valorMensual: valorMensualConRetiro,
                  });
                }

                // Extraer datos para SIN RETIRO
                const sinRetiroText = cells[2].innerText;
                const valorHoraSinRetiroMatch =
                  sinRetiroText.match(/Hora:? \$([\d.,]+)/);
                const valorMensualSinRetiroMatch = sinRetiroText.match(
                  /Mensual:? \$([\d.,]+)/
                );

                if (valorHoraSinRetiroMatch && valorMensualSinRetiroMatch) {
                  const valorHoraSinRetiro = parseFloat(
                    valorHoraSinRetiroMatch[1].replace(/[.,]/g, (m) =>
                      m === "." ? "" : "."
                    )
                  );
                  const valorMensualSinRetiro = parseFloat(
                    valorMensualSinRetiroMatch[1].replace(/[.,]/g, (m) =>
                      m === "." ? "" : "."
                    )
                  );

                  resultados.push({
                    fecha,
                    categoria,
                    tipo: "SIN RETIRO",
                    valorHora: valorHoraSinRetiro,
                    valorMensual: valorMensualSinRetiro,
                  });
                }
              } catch (error) {
                logger.error(
                  "Error extrayendo datos para la categoría:",
                  categoria,
                  error
                );
              }
            } else if (cells.length === 2) {
              try {
                // Extraer datos para CASEROS (sin distinción entre CON RETIRO y SIN RETIRO)
                const sinRetiroText = cells[1].innerText;
                const valorHoraSinRetiroMatch =
                  sinRetiroText.match(/Hora:? \$([\d.,]+)/);
                const valorMensualSinRetiroMatch = sinRetiroText.match(
                  /Mensual:? \$([\d.,]+)/
                );

                if (valorHoraSinRetiroMatch && valorMensualSinRetiroMatch) {
                  const valorHoraSinRetiro = parseFloat(
                    valorHoraSinRetiroMatch[1].replace(/[.,]/g, (m) =>
                      m === "." ? "" : "."
                    )
                  );
                  const valorMensualSinRetiro = parseFloat(
                    valorMensualSinRetiroMatch[1].replace(/[.,]/g, (m) =>
                      m === "." ? "" : "."
                    )
                  );

                  resultados.push({
                    fecha,
                    categoria,
                    tipo: "SIN RETIRO",
                    valorHora: valorHoraSinRetiro,
                    valorMensual: valorMensualSinRetiro,
                  });
                }
              } catch (error) {
                logger.error(
                  "Error extrayendo datos para la categoría CASEROS:",
                  categoria,
                  error
                );
              }
            }
          }
        });
      });
      return { resultados, warnings };
    });

    const { resultados, warnings } = data;

    // Mostrar advertencias de fechas no encontradas
    warnings.forEach((warning) => {
      logger.error(warning);
    });

    // Filtrar los resultados para devolver solo las fechas posteriores a la fecha proporcionada
    if (fechaInicio) {
      const resultadosFiltrados = resultados.filter(({ fecha }) => {
        return moment(fecha).isAfter(fechaInicioMoment, "day");
      });
      return resultadosFiltrados;
    } else {
      return resultados;
    }
  } catch (error) {
    logger.error(`Error de scraping page servicio doméstico: ${error}`);
    throw Error(error);
  } finally {
    if (browser) {
      await browser.close();
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
