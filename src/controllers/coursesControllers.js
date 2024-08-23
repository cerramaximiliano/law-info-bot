const logger = require("../config/logger");
const Courses = require("../models/courses"); // Importa el modelo de Courses
const moment = require("moment"); // Importa moment.js para manejar fechas

// Controlador para buscar cursos dentro del próximo mes y no notificados
const getUpcomingCoursesNotNotified = async () => {
  try {
    // Fecha de inicio: primer día del próximo mes
    const startOfNextMonth = moment().add(1, 'month').startOf('month').toDate();

    // Fecha de fin: último día del próximo mes
    const endOfNextMonth = moment().add(1, 'month').endOf('month').toDate();

    // Consulta a la base de datos
    const courses = await Courses.find({
      date: { $gte: startOfNextMonth, $lte: endOfNextMonth }, // Fecha dentro del próximo mes
      notifiedByTelegram: false, // No notificados por Telegram
    });

    // Devuelve los cursos encontrados
    return courses
  } catch (error) {
    logger.error(`Error en obtener registros de actividades: ${error}`);
    throw new Error (error)
  }
};

module.exports = {
  getUpcomingCoursesNotNotified,
};
