const winston = require("winston");
const { format } = winston;
const path = require("path");
const fs = require("fs").promises;

const MAX_LOG_SIZE_MB = 5;
const logFilePath = path.join(process.cwd(), "src", "logs", "app.log");

async function ensureLogDirectory() {
  const logDir = path.dirname(logFilePath);
  try {
    await fs.access(logDir);
  } catch {
    await fs.mkdir(logDir, { recursive: true });
  }
}

const logger = winston.createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack, file, line }) => {
      const filePath = file ? path.relative(process.cwd(), file) : "";
      return `${timestamp} ${level}: ${message}${
        filePath ? ` (File: ${filePath}, Line: ${line}` : ""
      }${stack ? `, Stack: ${stack}` : ""})`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: logFilePath,
      maxsize: MAX_LOG_SIZE_MB * 1024 * 1024,
    }),
  ],
});

function createLogWithDetails(level) {
    return function(message) {
        const stack = new Error().stack.split('\n')[2].trim();
        const matches = stack.match(/(.*):(\d+):\d+/);
        if (matches) {
            const [file, line] = matches.slice(1, 3);
            const relativePath = file.split('law-info-bot/')[1] || file.split('/').slice(-2).join('/');
            logger.log({
                level,
                message,
                file: relativePath,
                line
            });
        } else {
            logger.log({ level, message });
        }
    };
 }

const logWithDetails = {
  error: createLogWithDetails("error"),
  warn: createLogWithDetails("warn"),
  info: createLogWithDetails("info"),
  debug: createLogWithDetails("debug"),
  verbose: createLogWithDetails("verbose"),
};
// Initialize logger
ensureLogDirectory().catch(console.error);

const clearLogs = async () => {
  try {
    await fs.truncate(logFilePath, 0);
    logger.info("Archivo de logs limpiado correctamente.");
  } catch (err) {
    logger.error("Error al limpiar el archivo de logs:", err);
  }
};

module.exports = { logger, logWithDetails, clearLogs };
