const {logger} = require("../config/logger");
const Acts = require("../models/acts");
const FeesModel = require("../models/feesValues");
const FeesValuesCaba = require("../models/feesValuesCaba");
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
        siteId: siteId, // Identificador del sitio
      });
      savedNews.push(newNews); // Guarda la noticia en el array de noticias guardadas
    } catch (err) {
      if (err.code === 11000) {
        // Código de error para duplicados
        logger.info(`Noticia duplicada no guardada: ${news.title}`);
      } else {
        logger.error(`Error al guardar la noticia: ${news.title}`, err);
      }
    }
  }

  return savedNews; // Devuelve las noticias guardadas
}

async function getUnnotifiedNews(type = "news") {
  try {
    // Busca noticias donde notifiedByTelegram sea false
    let unnotified;
    if ((type === "news")) {
      unnotified = await News.find({ notifiedByTelegram: false });
    } else {
      unnotified = await Acts.find({ notifiedByTelegram: false });
    }
    logger.info(`Unnotified ${type} ${unnotified.length}`)
    return unnotified;
  } catch (err) {
    logger.error(`Error al buscar ${type} no notificadas:`, err);
    throw err;
  }
}

async function markAsNotified(newsId, type = "news") {
  try {
    // Actualiza el documento en la base de datos con notifiedByTelegram = true y notificationDate con la fecha actual
    let updatedElements;

    if (type === "news") {
      updatedElements = await News.findByIdAndUpdate(
        newsId,
        {
          notifiedByTelegram: true,
          notificationDate: new Date(),
        },
        { new: true } // Esto devuelve el documento actualizado
      );
    } else if ( type === "fees"){
      updatedElements = await FeesModel.updateMany(
        { _id: { $in: newsId } }, // Filtra por un array de IDs
        {
          notifiedByTelegram: true,
          notificationDate: new Date(),
        },
        { new: true }
      );
    } else if( type === "feesCaba"){
      updatedElements = await FeesValuesCaba.updateMany(
        { _id: { $in: newsId } }, // Filtra por un array de IDs
        {
          notifiedByTelegram: true,
          notificationDate: new Date(),
        },
        { new: true }
      );
    }
    
    else {
        updatedElements = await Acts.findByIdAndUpdate(
            newsId,
            {
              notifiedByTelegram: true,
              notificationDate: new Date(),
            },
            { new: true } // Esto devuelve el documento actualizado
          );
    }
    return updatedElements;
  } catch (err) {
    logger.error("Error al actualizar la notificación de la noticia/norma/fee:", err);
    throw err;
  }
}

module.exports = { saveNewNews, getUnnotifiedNews, markAsNotified };
