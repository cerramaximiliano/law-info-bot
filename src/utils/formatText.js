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

const generateTelegramMessageDomesticos = (entry) => {
  let message =
    "📢 *Actualización Ley 26.844 - Personal de Casas Particulares*\n\n";

  // Fecha de la actualización
  message += `📅 *Fecha:* ${new Date(entry.fecha).toLocaleDateString(
    "es-AR"
  )}\n\n`;

  // Iterar sobre cada categoría
  entry.categorias.forEach((categoria) => {
    message += `🔹 *${categoria.categoria}*\n`;

    categoria.tipos.forEach((tipo) => {
      message += `  - *${tipo.tipo}*\n`;
      message += `     • Valor Hora: $${tipo.valorHora}\n`;
      message += `     • Valor Mensual: $${tipo.valorMensual}\n`;
    });

    message += `\n`; // Espacio entre categorías
  });

  return message;
};

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

function formatLogReportEmail(report) {
  const criticalFilesText = report.criticalFiles
    .map(
      (file) =>
        `- ${file.file}: ${file.errors} errores, ${
          file.warnings
        } advertencias en líneas: ${file.lines.join(", ")}\n`
    )
    .join("\n");

  const recommendationsText = report.recommendations
    .map((rec) => `[${rec.priority}] ${rec.file}: ${rec.message}\n`)
    .join("\n");

  const errorDetailsText = report.errorDetails
    .map((error) => `- ${error.file}:${error.line} - ${error.message}\n`)
    .join("\n");

  return `
Reporte de Logs - ${report.date}

RESUMEN
-------
Total de logs: ${report.summary.totalLogs}
Errores: ${report.summary.errorCount}
Advertencias: ${report.summary.warnCount}
Archivos afectados: ${report.summary.filesAffected}
Inicializaciones de la aplicación: ${report.summary.appInitializations}

ARCHIVOS CRÍTICOS
----------------
${criticalFilesText}

RECOMENDACIONES
--------------
${recommendationsText}

DETALLES DE ERRORES
------------------
${errorDetailsText}
`;
}

module.exports = {
  truncateText,
  formatPrice,
  generateTelegramMessage,
  extractMontoAndPeriodo,
  getIdArray,
  parseDateAndMonto,
  generateTelegramMessageDomesticos,
  formatLogReportEmail,
};
