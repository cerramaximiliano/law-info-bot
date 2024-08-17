const { bot } = require("../services/bot");
const { truncateText } = require("../utils/formatText");
const { getUnnotifiedNews, markAsNotified } = require("./notiicasControllers");

// Función para manejar la notificación de noticias no notificadas
async function notifyUnnotifiedNews() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const topicId = process.env.TELEGRAM_TOPIC_ID;

  try {
    // Obtiene las noticias que no han sido notificadas
    const unnotifiedNews = await getUnnotifiedNews();
    const limitedNews = unnotifiedNews.slice(0, 2);

    for (let i = 0; i < limitedNews.length; i++) {
        const newsItem = limitedNews[i];
        // Notifica cada noticia usando el bot de Telegram
        const truncatedText = truncateText(newsItem.text, 15);
        const message = `*${newsItem.title}*\n${truncatedText}\n🔗 [Leer más](${newsItem.href})`;
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown", message_thread_id: topicId });
        // Marca la noticia como notificada en la base de datos
        //await markAsNotified(newsItem._id);
        // Si no es la última noticia, espera 5 minutos antes de enviar la siguiente
        if (i < limitedNews.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutos en milisegundos
        }
      }


  } catch (err) {
    console.error("Error al notificar noticias no notificadas:", err);
  }
}

module.exports = { notifyUnnotifiedNews };