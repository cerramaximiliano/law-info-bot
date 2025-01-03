const TelegramBot = require("node-telegram-bot-api");
const { logger } = require("../config/logger");

class BotHandler {
  constructor(token) {
    this.token = token;
    this.maxRetries = 5;
    this.baseRetryDelay = 5000; // 5 segundos iniciales
    this.maxRetryDelay = 300000; // máximo 5 minutos
    this.bot = null;
    this.consecutiveErrors = 0;
    this.isReconnecting = false;
    this.lastRestartTime = Date.now();
    this.healthCheckInterval = null;
    this.initBot();
  }

  initBot() {
    this.bot = new TelegramBot(this.token, {
      polling: {
        interval: 2000, // 2 segundos entre polls
        autoStart: false,
        params: {
          timeout: 30,
        },
      },
      request: {
        timeout: 30000, // 30 segundos timeout
        forever: true,
        pool: { maxSockets: 3 }, // Reducido para evitar sobrecarga
      },
    });

    this.setupErrorHandlers();
    this.startPolling();
    this.startHealthCheck();
  }

  async startPolling() {
    if (this.isReconnecting) {
      logger.warn("Already attempting to reconnect, skipping...");
      return;
    }

    try {
      await this.bot.startPolling();
      logger.info("Polling started successfully");
      this.consecutiveErrors = 0;
    } catch (error) {
      logger.error("Error starting polling:", error);
      await this.handleReconnection();
    }
  }

  setupErrorHandlers() {
    this.bot.on("polling_error", async (error) => {
      this.consecutiveErrors++;
      logger.error(
        `Polling error (${this.consecutiveErrors}):`,
        error.code || error.message
      );

      if (this.consecutiveErrors >= 3) {
        // Reducido a 3
        await this.handleReconnection();
      }
    });

    this.bot.on("message", () => {
      this.consecutiveErrors = 0;
    });

    // Manejo de errores no capturados
    process.on("uncaughtException", async (error) => {
      logger.error("Uncaught Exception:", error);
      await this.handleFatalError();
    });
  }

  async handleReconnection() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    let currentRetry = 0;

    while (currentRetry < this.maxRetries) {
      try {
        await this.bot.stopPolling();

        // Backoff exponencial con jitter
        const delay = Math.min(
          this.baseRetryDelay *
            Math.pow(2, currentRetry) *
            (0.5 + Math.random()),
          this.maxRetryDelay
        );

        logger.info(
          `Waiting ${delay / 1000} seconds before retry ${currentRetry + 1}/${
            this.maxRetries
          }`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));

        await this.bot.startPolling();
        logger.info("Reconnection successful");
        this.consecutiveErrors = 0;
        this.isReconnecting = false;
        return;
      } catch (error) {
        currentRetry++;
        logger.error(`Reconnection attempt ${currentRetry} failed:`, error);
      }
    }

    logger.error("Max retries reached, entering cooldown period");
    await this.handleFatalError();
  }

  async handleFatalError() {
    this.isReconnecting = false;

    // Verificar si han pasado al menos 5 minutos desde el último reinicio
    const timeSinceLastRestart = Date.now() - this.lastRestartTime;
    if (timeSinceLastRestart < 300000) {
      // 5 minutos
      logger.warn("Too many restarts in short period, extending cooldown");
      await new Promise((resolve) => setTimeout(resolve, 300000));
    }

    this.lastRestartTime = Date.now();
    logger.info("Attempting fresh start after cooldown");
    this.consecutiveErrors = 0;
    await this.startPolling();
  }

  startHealthCheck() {
    // Cancelar health check existente si hay uno
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!this.isReconnecting) {
          const me = await this.bot.getMe();
          if (!me) {
            logger.warn("Health check failed, initiating reconnection");
            await this.handleReconnection();
          }
        }
      } catch (error) {
        logger.error("Health check error:", error);
        await this.handleReconnection();
      }
    }, 60000); // Check cada minuto
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Validación del token
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not defined");
}

const botHandler = new BotHandler(token);
module.exports = { bot: botHandler.bot };
