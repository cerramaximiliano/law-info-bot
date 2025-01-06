const TelegramBot = require("node-telegram-bot-api");
const { logWithDetails } = require("../config/logger");
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('polling_error', (error) => {
  logWithDetails.error('Polling error:', error);
});

module.exports = { bot };
