const News = require("../models/news");

// Función para guardar las noticias nuevas
async function saveNewNews(newsArray, siteId) {
    const savedNews = [];

    for (const news of newsArray) {
        try {
            // Intenta insertar la noticia si no existe
            const newNews = await News.create({
                href: news.href,
                title: news.title,
                text: news.text,
                id: news.id,
                siteId: siteId // Identificador del sitio
            });
            savedNews.push(newNews); // Guarda la noticia en el array de noticias guardadas
        } catch (err) {
            if (err.code === 11000) { // Código de error para duplicados
                console.log(`Noticia duplicada no guardada: ${news.title}`);
            } else {
                console.error(`Error al guardar la noticia: ${news.title}`, err);
            }
        }
    }

    return savedNews; // Devuelve las noticias guardadas
}

async function getUnnotifiedNews() {
    try {
        // Busca noticias donde notifiedByTelegram sea false
        const unnotifiedNews = await News.find({ notifiedByTelegram: false });
        return unnotifiedNews;
    } catch (err) {
        console.error('Error al buscar noticias no notificadas:', err);
        throw err;
    }
}


async function markAsNotified(newsId) {
    try {
        // Actualiza el documento en la base de datos con notifiedByTelegram = true y notificationDate con la fecha actual
        const updatedNews = await News.findByIdAndUpdate(
            newsId, 
            { 
                notifiedByTelegram: true, 
                notificationDate: new Date() 
            }, 
            { new: true } // Esto devuelve el documento actualizado
        );
        return updatedNews;
    } catch (err) {
        console.error('Error al actualizar la notificación de la noticia:', err);
        throw err;
    }
}

module.exports = { saveNewNews, getUnnotifiedNews, markAsNotified };
