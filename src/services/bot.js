const TelegramBot = require('node-telegram-bot-api');
const { logger } = require('../config/logger');

class BotHandler {
  constructor(token) {
    this.token = token;
    this.maxRetries = 3;
    this.retryDelay = 15000; // Aumentado a 15 segundos
    this.bot = null;
    this.consecutiveErrors = 0;
    this.initBot();
  }

  initBot() {
    this.bot = new TelegramBot(this.token, {
      polling: {
        interval: 1000,    // Aumentado el intervalo
        autoStart: false,  // Iniciamos manualmente
        params: {
          timeout: 30      // Aumentado el timeout
        }
      },
      request: {
        timeout: 60000,    // Timeout de 60 segundos
        forever: true,     // Mantener conexión
        pool: { maxSockets: 5 }
      }
    });

    this.setupErrorHandlers();
    this.startPolling();
  }

  async startPolling() {
    try {
      await this.bot.startPolling();
      logger.info('Polling started successfully');
    } catch (error) {
      logger.error('Error starting polling:', error);
      await this.handleFatalError();
    }
  }

  setupErrorHandlers() {
    this.bot.on('polling_error', async (error) => {
      this.consecutiveErrors++;
      logger.error(`Polling error (${this.consecutiveErrors}):`, error.code || error.message);
      
      if (this.consecutiveErrors >= 5) {
        logger.error('Too many consecutive errors, restarting bot...');
        this.consecutiveErrors = 0;
        await this.handleFatalError();
      }
    });

    // Reset contador de errores cuando hay éxito
    this.bot.on('message', () => {
      this.consecutiveErrors = 0;
    });
  }

  async handleFatalError() {
    try {
      await this.bot.stopPolling();
    } catch (error) {
      logger.error('Error stopping polling:', error);
    }

    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    await this.startPolling();
  }
}

// Inicialización con verificación del token
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined');
}

const botHandler = new BotHandler(token);
module.exports = { bot: botHandler.bot };