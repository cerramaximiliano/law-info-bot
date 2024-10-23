const moment = require("moment");
moment.locale("es");
function parseDate(dateString) {
  // Eliminar el día de la semana de la cadena
  const formattedDate = dateString.replace(/^\w+\s/, "").trim();

  // Parsear la fecha con moment usando el formato 'DD [de] MMMM'
  const parsedDate = moment(formattedDate, "DD [de] MMMM", "es");

  // Devolver el objeto Date si la fecha es válida, de lo contrario, devolver null
  return parsedDate.isValid() ? parsedDate.toDate() : null;
}

const parseDateFormat = (dateString) => {
  const formattedDate = dateString.trim(); // Limpiar cualquier espacio adicional
  const date = moment(formattedDate, "DD MMMM YYYY", "es"); // Especificar el formato de entrada y el idioma (español)
  return date.isValid() ? date.toDate() : null; // Convertir a objeto Date o retornar null si la fecha no es válida
};

function formatPeriod(dateStr) {
  const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const date = new Date(dateStr);
  return `${months[date.getMonth()]}-${date.getFullYear()}`;
}


module.exports = { parseDate, parseDateFormat, formatPeriod };
