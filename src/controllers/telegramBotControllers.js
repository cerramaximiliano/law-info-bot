

const { bot } = require('../services/bot');
const { getUnnotifiedNews, markAsNotified } = require('./notiicasControllers');


// Función para manejar la notificación de noticias no notificadas
async function notifyUnnotifiedNews(bot) {
    try {
        // Obtiene las noticias que no han sido notificadas
        const unnotifiedNews = await getUnnotifiedNews();

        for (const newsItem of unnotifiedNews) {
            // Notifica cada noticia usando el bot de Telegram
            //await bot.sendMessage( , newsItem); // Función de ejemplo, debes implementar el envío

            console.log(newsItem)

            // Marca la noticia como notificada en la base de datos
            //await markAsNotified(newsItem._id);
        }
    } catch (err) {
        console.error('Error al notificar noticias no notificadas:', err);
    }
}

module.exports = { notifyUnnotifiedNews };
