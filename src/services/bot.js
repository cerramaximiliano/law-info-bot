const TelegramBot = require('node-telegram-bot-api');
const Noticia = require('../models/news');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });


module.exports = { bot };