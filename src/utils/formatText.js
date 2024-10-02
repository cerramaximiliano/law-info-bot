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

function generateTelegramMessage(results) {
  // Cabecera del mensaje
  let message = "Actualización valor UMA PJN Ley 27.423\n\n";

  // Iterar sobre cada uno de los resultados y formatear los valores
  results.forEach((result) => {
    const formattedVigencia = moment(result.vigencia).format("DD-MM-YYYY"); // Formatear fecha de vigencia
    const formattedMonto = `$ ${result.monto}`; // Formatear monto con dos decimales

    // Agregar al mensaje cada item
    message += `- Vigencia: ${formattedVigencia}, Monto: ${formattedMonto}\n`;
  });

  return message;
}

module.exports = { truncateText, formatPrice, generateTelegramMessage };
