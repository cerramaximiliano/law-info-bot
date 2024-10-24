const puppeteer = require('puppeteer');

async function obtenerHtmlDesdeWeb(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const html = await page.content();
  await browser.close();
  return html;
}

function obtenerHaberes(html) {
  const result = {};

  // Buscar el haber mínimo garantizado
  const haberMinimoRegex = /haber mínimo garantizado vigente a partir del mes de (\w+) de (\d{4}).*?\$(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const haberMinimoMatch = html.match(haberMinimoRegex);
  if (haberMinimoMatch) {
    result.haberMinimo = {
      mes: haberMinimoMatch[1],
      anio: haberMinimoMatch[2],
      monto: parseFloat(haberMinimoMatch[3].replace(/\./g, '').replace(',', '.')),
    };
  }

  // Buscar el haber máximo vigente
  const haberMaximoRegex = /haber máximo vigente a partir del mes de (\w+) de (\d{4}).*?\$(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const haberMaximoMatch = html.match(haberMaximoRegex);
  if (haberMaximoMatch) {
    result.haberMaximo = {
      mes: haberMaximoMatch[1],
      anio: haberMaximoMatch[2],
      monto: parseFloat(haberMaximoMatch[3].replace(/\./g, '').replace(',', '.')),
    };
  }

  // Buscar la Prestación Básica Universal
  const pbuRegex = /Prestación Básica Universal \(PBU\) prevista en el artículo \d+ de la Ley Nº \d+, aplicable a partir del mes de (\w+) de (\d{4}).*?\$(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const pbuMatch = html.match(pbuRegex);
  if (pbuMatch) {
    result.prestacionBasicaUniversal = {
      mes: pbuMatch[1],
      anio: pbuMatch[2],
      monto: parseFloat(pbuMatch[3].replace(/\./g, '').replace(',', '.')),
    };
  }

  // Buscar la Pensión Universal para el Adulto Mayor
  const puamRegex = /Pensión Universal para el Adulto Mayor \(PUAM\), prevista en el artículo \d+ de la Ley Nº \d+, aplicable a partir del mes de (\w+) de (\d{4}).*?\$(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const puamMatch = html.match(puamRegex);
  if (puamMatch) {
    result.pensionUniversalAdultoMayor = {
      mes: puamMatch[1],
      anio: puamMatch[2],
      monto: parseFloat(puamMatch[3].replace(/\./g, '').replace(',', '.')),
    };
  }

  // Buscar las bases imponibles mínima y máxima
  const basesImponiblesRegex = /bases imponibles mínima y máxima.*?en la suma de PESOS (\d{1,3}(?:\.\d{3})*,\d{2}).*?y PESOS (\d{1,3}(?:\.\d{3})*,\d{2}), respectivamente, a partir del período devengado (\w+) de (\d{4})/i;
  const basesImponiblesMatch = html.match(basesImponiblesRegex);
  if (basesImponiblesMatch) {
    result.basesImponibles = {
      mes: basesImponiblesMatch[3],
      anio: basesImponiblesMatch[4],
      minimo: parseFloat(basesImponiblesMatch[1].replace(/\./g, '').replace(',', '.')),
      maximo: parseFloat(basesImponiblesMatch[2].replace(/\./g, '').replace(',', '.')),
    };
  }

  return result;
}

(async () => {
  try {
    const url = 'https://example.com'; // Reemplazar con la URL deseada
    const htmlContent = await obtenerHtmlDesdeWeb(url);
    const haberes = obtenerHaberes(htmlContent);
    console.log(haberes);
  } catch (err) {
    console.error('Error al realizar el scraping:', err);
  }
})();
