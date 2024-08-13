const TelegramBot = require('node-telegram-bot-api');
const Noticia = require('../models/noticia');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const enviarNoticias = async () => {
  try {
    const noticias = await Noticia.find({}).sort({ fecha: -1 }).limit(5);
    noticias.forEach((noticia) => {
      const message = `📰 *${noticia.titulo}*
${noticia.resumen}
[Leer más](${noticia.enlace})`;
      bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
    });
  } catch (error) {
    console.error('Error enviando noticias:', error);
  }
};

module.exports = { enviarNoticias };