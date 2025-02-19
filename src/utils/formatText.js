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
        `- ${file.file}: ${file.errors} errores, ${file.warnings
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

function generateMessageTelegramLaboral(documento) {
  try {
    if (!documento || !documento.detalles || !documento.fecha) {
      throw new Error('Documento inválido o incompleto');
    }

    // Formatear la fecha
    const fecha = new Date(documento.fecha);
    const formatter = new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
    const fechaFormateada = formatter.format(fecha);
    const fechaCapitalizada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);

    // Determinar el tipo de convenio basado en la estructura de los datos
    let tipoConvenio = '';
    const primerCategoria = documento.detalles[0].categoría;
    if (['Maestranza', 'Administrativos', 'Cajeros'].some(cat => documento.detalles.some(d => d.categoría === cat))) {
      tipoConvenio = 'Comercio';
    } else if (['Oficial Especializado', 'Oficial', 'Medio Oficial'].some(cat => documento.detalles.some(d => d.categoría === cat))) {
      tipoConvenio = 'Construcción';
    } else if (['A', 'B', 'C', 'D', 'Especial'].some(cat => documento.detalles.some(d => d.categoría === cat))) {
      tipoConvenio = 'Gastronomía';
    }

    // Ordenar las categorías según el primer importe de cada subcategoría (orden ascendente)
    const detallesOrdenados = [...documento.detalles].sort((a, b) => {
      const primerImporteA = a.subcategorías[0]?.importe || 0;
      const primerImporteB = b.subcategorías[0]?.importe || 0;
      return primerImporteA - primerImporteB; // Cambiado a orden ascendente
    });

    // Construir el mensaje con el título correspondiente
    let mensaje = '';
    switch (tipoConvenio) {
      case 'Comercio':
        mensaje = `🏢 *Escala Salarial Empleados de Comercio*\n`;
        break;
      case 'Construcción':
        mensaje = `🏗️ *Escala Salarial UOCRA*\n`;
        break;
      case 'Gastronomía':
        mensaje = `🍽️ *Escala Salarial Gastronómicos*\n`;
        break;
      default:
        mensaje = `📊 *Nueva Escala Salarial*\n`;
    }

    mensaje += `📅 *${fechaCapitalizada}*\n\n`;

    // Agregar el acuerdo si existe
    if (documento.acuerdo) {
      mensaje += `📋 ${documento.acuerdo}\n\n`;
    }

    // Agregar los detalles de cada categoría (ahora ordenados ascendentemente)
    detallesOrdenados.forEach(categoria => {
      mensaje += `*${categoria.categoría}*\n`;

      categoria.subcategorías.forEach(sub => {
        const importeFormateado = sub.importe.toLocaleString('es-AR');

        // Formato específico según el tipo de convenio
        if (tipoConvenio === 'Construcción') {
          mensaje += `• ${sub.nivel}: $${importeFormateado} por hora\n`;
        } else {
          mensaje += `• ${tipoConvenio === 'Gastronomía' ? 'Nivel' : ''} ${sub.nivel}: $${importeFormateado}\n`;
        }
      });

      mensaje += '\n';
    });

    // Agregar resumen si existe
    if (documento.resumen) {
      mensaje += `📌 ${documento.resumen}\n\n`;
    }

    // Agregar fuente si existe
    if (documento.fuente) {
      mensaje += `📰 Fuente: ${documento.fuente}`;
    }

    return {
      exito: true,
      mensaje,
    };

  } catch (error) {
    return {
      exito: false,
      mensaje: 'Error al generar el mensaje',
      error: error.message
    };
  }
}


module.exports = {
  truncateText,
  formatPrice,
  generateTelegramMessage,
  extractMontoAndPeriodo,
  getIdArray,
  parseDateAndMonto,
  generateTelegramMessageDomesticos,
  generateMessageTelegramLaboral,
  formatLogReportEmail,
};
