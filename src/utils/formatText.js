const moment = require("moment");

function truncateText(text, maxWords) {
  const words = text.split(" "); // Divide el texto en palabras
  if (words.length > maxWords) {
    return words.slice(0, maxWords).join(" ") + "..."; // Recorta el texto y agrega '...'
  }
  return text; // Si el texto es corto, devuélvelo tal cual
}

const formatPrice = (priceString) => {
  // Eliminar cualquier símbolo de moneda y formato
  const numericPrice = priceString.replace(/[^0-9,]/g, "").replace(",", ".");

  return `${numericPrice} ARS`; // Retornar el precio formateado en ARS
};

function generateTelegramMessage(title, results) {
  // Cabecera del mensaje
  let message = `${title}\n\n`;

  // Iterar sobre cada uno de los resultados y formatear los valores
  results.forEach((result) => {
    const formattedVigencia = moment(result.vigencia).format("DD-MM-YYYY"); // Formatear fecha de vigencia
    const formattedMonto = `$ ${result.monto.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`; // Formatear monto con separador de miles y dos decimales

    // Agregar al mensaje cada item con emoji de calendario
    message += `📅 ${formattedVigencia}, 💵 ${formattedMonto}\n`;
  });

  return message;
}

function extractMontoAndPeriodo(dataArray) {
  dataArray.sort((a, b) => moment(a.vigencia) - moment(b.vigencia));
  return dataArray.map(({ monto, periodo }) => ({
    monto: monto.toLocaleString("es-AR"),
    periodo,
  }));
}

function getIdArray(objectsArray) {
  return objectsArray.map((obj) => obj._id);
}

function parseDateAndMonto(cell, type) {
  const match = cell.match(
    /A partir del (\d+º? (?:de )?\w+ de \d+): \$ ([\d\.\,\-]+)/
  );
  if (match) {
    const dateParts = match[1].replace("º", "").split(/ de | /);
    const day = parseInt(dateParts[0], 10);
    const month = dateParts[1];
    const year = parseInt(dateParts[2], 10);
    const months = {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11,
    };
    const date = new Date(year, months[month], day);
    const monto = parseFloat(match[2].replace(/\./g, "").replace(",", "."));
    return {
      fecha: date,
      vigencia: date,
      monto: monto,
      type: type,
    };
  }
  return null;
}

function obtenerHaberes(html) {
  const result = {};

  // Buscar el haber mínimo garantizado
  const haberMinimoRegex =
    /haber mínimo garantizado vigente a partir del mes de (\w+) de (\d{4}).*?\$(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const haberMinimoMatch = html.match(haberMinimoRegex);
  if (haberMinimoMatch) {
    result.haberMinimo = {
      mes: haberMinimoMatch[1],
      anio: haberMinimoMatch[2],
      monto: parseFloat(
        haberMinimoMatch[3].replace(/\./g, "").replace(",", ".")
      ),
    };
  }

  // Buscar el haber máximo vigente
  const haberMaximoRegex =
    /haber máximo vigente a partir del mes de (\w+) de (\d{4}).*?\$(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const haberMaximoMatch = html.match(haberMaximoRegex);
  if (haberMaximoMatch) {
    result.haberMaximo = {
      mes: haberMaximoMatch[1],
      anio: haberMaximoMatch[2],
      monto: parseFloat(
        haberMaximoMatch[3].replace(/\./g, "").replace(",", ".")
      ),
    };
  }

  // Buscar la Prestación Básica Universal
  const pbuRegex =
    /Prestación Básica Universal \(PBU\) prevista en el artículo \d+ de la Ley Nº \d+, aplicable a partir del mes de (\w+) de (\d{4}).*?\$(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const pbuMatch = html.match(pbuRegex);
  if (pbuMatch) {
    result.prestacionBasicaUniversal = {
      mes: pbuMatch[1],
      anio: pbuMatch[2],
      monto: parseFloat(pbuMatch[3].replace(/\./g, "").replace(",", ".")),
    };
  }

  // Buscar la Pensión Universal para el Adulto Mayor
  const puamRegex =
    /Pensión Universal para el Adulto Mayor \(PUAM\), prevista en el artículo \d+ de la Ley Nº \d+, aplicable a partir del mes de (\w+) de (\d{4}).*?\$(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const puamMatch = html.match(puamRegex);
  if (puamMatch) {
    result.pensionUniversalAdultoMayor = {
      mes: puamMatch[1],
      anio: puamMatch[2],
      monto: parseFloat(puamMatch[3].replace(/\./g, "").replace(",", ".")),
    };
  }

  // Buscar las bases imponibles mínima y máxima
  const basesImponiblesRegex =
    /bases imponibles mínima y máxima.*?en la suma de PESOS (\d{1,3}(?:\.\d{3})*,\d{2}).*?y PESOS (\d{1,3}(?:\.\d{3})*,\d{2}), respectivamente, a partir del período devengado (\w+) de (\d{4})/i;
  const basesImponiblesMatch = html.match(basesImponiblesRegex);
  if (basesImponiblesMatch) {
    result.basesImponibles = {
      mes: basesImponiblesMatch[3],
      anio: basesImponiblesMatch[4],
      minimo: parseFloat(
        basesImponiblesMatch[1].replace(/\./g, "").replace(",", ".")
      ),
      maximo: parseFloat(
        basesImponiblesMatch[2].replace(/\./g, "").replace(",", ".")
      ),
    };
  }

  return result;
}

module.exports = {
  truncateText,
  formatPrice,
  generateTelegramMessage,
  extractMontoAndPeriodo,
  getIdArray,
  parseDateAndMonto,
  obtenerHaberes,
};
