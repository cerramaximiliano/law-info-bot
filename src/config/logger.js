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
    format.printf(
      ({ timestamp, level, message, stack, file, line, functionName }) => {
        const filePath = file ? path.relative(process.cwd(), file) : "";
        return `${timestamp} ${level}: ${message}${
          filePath
            ? ` (File: ${filePath}, Line: ${line}, Function: ${
                functionName || "anonymous"
              })`
            : ""
        }${stack ? `, Stack: ${stack}` : ""}`;
      }
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: logFilePath,
      maxsize: MAX_LOG_SIZE_MB * 1024 * 1024,
      tailable: true,
    }),
  ],
});

function createLogWithDetails(level) {
  return function (message) {
    const stack = new Error().stack.split("\n")[2].trim();

    // Primera expresión regular para capturar la función
    const functionMatch = stack.match(/at (\w+|\w+\.\w+) /);
    let functionName = "anonymous";

    if (functionMatch && functionMatch[1]) {
      functionName = functionMatch[1];
    }

    // Segunda expresión regular para capturar archivo y línea
    const locationMatch = stack.match(/(.*):(\d+):\d+/);

    if (locationMatch) {
      const [, file, line] = locationMatch;
      const relativePath =
        file.split("law-info-bot/")[1] || file.split("/").slice(-2).join("/");

      logger.log({
        level,
        message,
        file: relativePath,
        line,
        functionName,
      });
    } else {
      logger.log({
        level,
        message,
        functionName,
      });
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
    logWithDetails.info("Archivo de logs limpiado correctamente.");
  } catch (err) {
    logWithDetails.error("Error al limpiar el archivo de logs:", err);
  }
};

module.exports = { logger, logWithDetails, clearLogs };
