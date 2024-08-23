function truncateText(text, maxWords) {
  const words = text.split(" "); // Divide el texto en palabras
  if (words.length > maxWords) {
    return words.slice(0, maxWords).join(" ") + "..."; // Recorta el texto y agrega '...'
  }
  return text; // Si el texto es corto, devuélvelo tal cual
};

const formatPrice = (priceString) => {
  // Eliminar cualquier símbolo de moneda y formato
  const numericPrice = priceString.replace(/[^0-9,]/g, "").replace(",", ".");
  
  return `${numericPrice} ARS`; // Retornar el precio formateado en ARS
};

module.exports = { truncateText, formatPrice };
