const puppeteer = require("puppeteer");
const News = require("../models/news");
const Acts = require("../models/acts");
const { saveNewNews } = require("../controllers/notiicasControllers");
const hashStringToNumber = require("../utils/formatId");
const logger = require("../config/logger");
const Courses = require("../models/courses");
const { parseDate, parseDateFormat } = require("../utils/formatDate");
const moment = require("moment"); // Para formatear las fechas si es necesario
require("moment/locale/es");


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

  // Muestra los elementos agrupados en la consola
  console.log(elements);

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
        console.log(`Artículo guardado: ${article.title}`);
      } else {
        console.log(`Artículo ya existe: ${article.title}`);
      }
    } catch (error) {
      console.error(`Error guardando artículo: ${article.title}`, error);
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
        console.log(`Artículo guardado: ${article.title}`);
      } else {
        console.log(`Artículo ya existe: ${article.title}`);
      }
    } catch (error) {
      console.error(`Error guardando artículo: ${article.title}`, error);
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
        console.log(`Artículo guardado: ${article.title}`);
      } else {
        console.log(`Artículo ya existe: ${article.title}`);
      }
    } catch (error) {
      console.error(`Error guardando artículo: ${article.title}`, error);
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
    console.log(error);
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
    await page.goto("http://www.derecho.uba.ar/graduados/programas-de-perfeccionamiento/", {
      waitUntil: "networkidle2",
    });

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
          const priceUBAMatch = contenidoElement.textContent.match(/Precio para graduadas\/os UBA: (Gratis|\$\d{1,3}(?:\.\d{3})*)/);
          const priceOthersMatch = contenidoElement.textContent.match(/Precio para graduadas\/os de otras universidades: (Gratis|\$\d{1,3}(?:\.\d{3})*)/);

          priceUBA = priceUBAMatch ? priceUBAMatch[1].trim() : "No disponible";
          priceOthers = priceOthersMatch ? priceOthersMatch[1].trim() : "No disponible";
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
        programa.priceUBA = programa.priceUBA ? formatPrice(programa.priceUBA) : "No disponible";
        programa.priceOthers = programa.priceOthers ? formatPrice(programa.priceOthers) : "No disponible";

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
};
