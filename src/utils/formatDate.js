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


const monthNames = {
  // Nombres en mayúsculas
  'ENERO': 1,
  'FEBRERO': 2,
  'MARZO': 3,
  'ABRIL': 4,
  'MAYO': 5,
  'JUNIO': 6,
  'JULIO': 7,
  'AGOSTO': 8,
  'SEPTIEMBRE': 9,
  'OCTUBRE': 10,
  'NOVIEMBRE': 11,
  'DICIEMBRE': 12,

  // Nombres en minúsculas
  'enero': 1,
  'febrero': 2,
  'marzo': 3,
  'abril': 4,
  'mayo': 5,
  'junio': 6,
  'julio': 7,
  'agosto': 8,
  'septiembre': 9,
  'octubre': 10,
  'noviembre': 11,
  'diciembre': 12,

  // Variaciones con tilde
  'SEPTIEMBRE': 9,
  'DICIEMBRE': 12,
  'septiembre': 9,
  'diciembre': 12
};

// Función auxiliar para normalizar el nombre del mes
const normalizarMes = (mes) => {
  return mes.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
    .toLowerCase();
};

// Función para obtener el número de mes
const obtenerNumeroMes = (nombreMes) => {
  const mesNormalizado = normalizarMes(nombreMes);
  return monthNames[mesNormalizado] || monthNames[nombreMes] || null;
};


module.exports = { parseDate, parseDateFormat, formatPeriod, monthNames, normalizarMes, obtenerNumeroMes };
