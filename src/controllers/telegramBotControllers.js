const { logWithDetails } = require("../config/logger");
const Courses = require("../models/courses");
const { bot } = require("../services/bot");
const { truncateText } = require("../utils/formatText");
const { getUpcomingCoursesNotNotified } = require("./coursesControllers");
const { getUnnotifiedNews, markAsNotified } = require("./notiicasControllers");
const moment = require("moment");
require("moment/locale/es");

// Función para manejar la notificación de noticias no notificadas
async function notifyUnnotifiedNews(type = "news", limit = 5, interval = 30) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  let topicId;
  if (type === "news") topicId = process.env.TELEGRAM_TOPIC_ID;
  else topicId = process.env.TELEGRAM_TOPIC_ACTS_ID;
  try {
    // Obtiene las noticias que no han sido notificadas
    const unnotifiedNews = await getUnnotifiedNews(type);
    const limitedNews = unnotifiedNews.slice(0, limit);

    for (let i = 0; i < limitedNews.length; i++) {
      const newsItem = limitedNews[i];
      // Notifica cada noticia usando el bot de Telegram
      const truncatedText = truncateText(newsItem.text, 15);
      const message = `*${newsItem.title}*\n${truncatedText}\n🔗 [Leer más](${newsItem.href})`;
      await bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        message_thread_id: topicId,
      });
      logWithDetails.info("Noticia/Norma notificada por telegram");
      // Marca la noticia como notificada en la base de datos
      if (process.env.NODE_ENV === "production") {
        await markAsNotified(newsItem._id, type);
        logWithDetails.info("Noticia/Norma marcada como notificada");
      }

      // Si no es la última noticia, espera 5 minutos antes de enviar la siguiente
      if (i < limitedNews.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, interval * 60 * 1000)
        ); // 5 minutos en milisegundos
      }
    }
  } catch (err) {
    logWithDetails.error("Error al notificar noticias no notificadas:", err);
  }
}

const notifyUpcomingCourses = async () => {
  try {
    // 1. Obtener los cursos no notificados del próximo mes
    const courses = await Courses.find({
      date: {
        $gte: moment().add(1, "month").startOf("month").toDate(),
        $lte: moment().add(1, "month").endOf("month").toDate(),
      },
      notifiedByTelegram: false,
    });

    if (courses.length === 0) {
      logWithDetails.info("No hay cursos para notificar.");
      return;
    }

    // 2. Armar el mensaje de Telegram
    const nextMonthName = moment().add(1, "month").format("MMMM");
    let message = `📅 *Cursos del mes de ${nextMonthName}*\n\n`;
    courses.forEach((course) => {
      const dateFormatted = moment(course.date).format("DD MMMM YYYY");
      message += `*Título:* ${course.title}\n`;
      message += `*Fecha:* ${dateFormatted}\n`;
      message += `*Sitio:* ${course.siteId}\n`;
      message += `*Link:* ${course.link}\n`;
      message +=
        course.price !== "Precio no disponible"
          ? `*Precio:* ${course.price}\n`
          : "";
      message += `\n`;
    });

    // 3. Enviar el mensaje a través del bot de Telegram
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const topicId = process.env.TELEGRAM_TOPIC_COURSES_ID;
    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      message_thread_id: topicId,
    });

    // 4. Actualizar los cursos en la base de datos - Solo se actualizan si corren en modo producción
    for (let course of courses) {
      if (process.env.NODE_ENV === "production") {
        course.notifiedByTelegram = true;
        course.notificationDate = new Date();
        await course.save();
      }
    }

    logWithDetails.info("Notificación enviada y cursos actualizados.");
  } catch (error) {
    logWithDetails.error("Error al notificar los cursos:", error);
  }
};

const notifyUpcomingUBACourses = async () => {
  try {
    // 1. Obtener los cursos no notificados del próximo mes que tengan siteId "UBA Derecho"
    const courses = await Courses.find({
      date: {
        $gte: moment().add(1, "month").startOf("month").toDate(),
        $lte: moment().add(1, "month").endOf("month").toDate(),
      },
      notifiedByTelegram: false,
      siteId: "UBA Derecho", // Filtrar por siteId
    });

    if (courses.length === 0) {
      logWithDetails.info("No hay cursos de UBA Derecho para notificar.");
      return;
    }

    // 2. Armar el mensaje de Telegram
    const nextMonthName = moment().add(1, "month").format("MMMM");
    let message = `📅 *Cursos del mes de ${nextMonthName} en UBA Derecho*\n\n`;
    courses.forEach((course) => {
      const dateFormatted = moment(course.date).format("DD MMMM YYYY");
      message += `*Título:* ${course.title}\n`;
      message += `*Fecha:* ${dateFormatted}\n`;
      message += `*Sitio:* ${course.siteId}\n`;
      message += `*Link:* ${course.link}\n`;

      // Validar si el precio está definido y no es "No disponible"
      if (course.price && course.price !== "No disponible") {
        message += `*Precio:* ${course.price}\n`;
      }

      message += `\n`;
    });

    // 3. Enviar el mensaje a través del bot de Telegram
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const topicId = process.env.TELEGRAM_TOPIC_COURSES_ID;
    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      message_thread_id: topicId,
    });

    // 4. Actualizar los cursos en la base de datos
    for (let course of courses) {
      if (process.env.NODE_ENV === "production") {
        course.notifiedByTelegram = true;
        course.notificationDate = new Date();
        await course.save();
      }
    }

    logWithDetails.info(
      "Notificación de cursos de UBA Derecho enviada y cursos actualizados."
    );
  } catch (error) {
    logWithDetails.error("Error al notificar los cursos de UBA Derecho:", error);
  }
};

const notifyUnnotifiedFees = async (message, ids, type) => {
  try {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const topicId = process.env.TELEGRAM_TOPIC_ID;
    
    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      message_thread_id: topicId,
    });

    if (process.env.NODE_ENV === "production") {
      await markAsNotified(ids, type);
      logWithDetails.info("Fee marcada como notificada");
    }
    
    return true; // Return true on successful execution
  } catch (error) {
    logWithDetails.error("Error notificando fees:", error);
    return false; // Return false on error
  }
};

const notifyUnnotifiedLaboral = async (message) => {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const topicId = process.env.TELEGRAM_TOPIC_LABORAL_ID;
  try {
    const messageId = await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      message_thread_id: topicId,
    });
    return messageId.message_id;
  } catch (error) {
    logWithDetails.error(`Error Telegram al notificar mensaje laboral`);
    throw new Error(error);
  }
};

module.exports = {
  notifyUnnotifiedNews,
  notifyUpcomingCourses,
  notifyUpcomingUBACourses,
  notifyUnnotifiedFees,
  notifyUnnotifiedLaboral,
};
