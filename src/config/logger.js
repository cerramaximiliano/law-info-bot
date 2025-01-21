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

// Función para verificar y limpiar el log si excede el tamaño
async function checkAndResetLogFile() {
  try {
    const stats = await fs.stat(logFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    if (fileSizeInMB >= MAX_LOG_SIZE_MB) {
      await fs.writeFile(logFilePath, ''); // Limpia el archivo
      logger.info('Log file has been reset due to size limit');
    }
  } catch (error) {
    // Si el archivo no existe, no hacemos nada
    if (error.code !== 'ENOENT') {
      console.error('Error checking log file:', error);
    }
  }
}

const logger = winston.createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack, file, line, functionName }) => {
      const filePath = file ? path.relative(process.cwd(), file) : "";
      return `${timestamp} ${level}: ${message}${
        filePath ? ` (File: ${filePath}, Line: ${line}, Function: ${functionName || 'anonymous'})` : ""
      }${stack ? `, Stack: ${stack}` : ""}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.Stream({
      stream: require('fs').createWriteStream(logFilePath, { flags: 'a' })
    })
  ],
});

// Verificar tamaño antes de cada log
const originalLog = logger.log.bind(logger);
logger.log = async function(...args) {
  await checkAndResetLogFile();
  originalLog.apply(this, args);
};

function createLogWithDetails(level) {
  return async function(message) {
    const stack = new Error().stack.split('\n')[2].trim();
    
    const functionMatch = stack.match(/at (\w+|\w+\.\w+) /);
    let functionName = 'anonymous';
    
    if (functionMatch && functionMatch[1]) {
      functionName = functionMatch[1];
    }
    
    const locationMatch = stack.match(/(.*):(\d+):\d+/);
    
    if (locationMatch) {
      const [, file, line] = locationMatch;
      const relativePath = file.split('law-info-bot/')[1] || file.split('/').slice(-2).join('/');
      
      logger.log({
        level,
        message,
        file: relativePath,
        line,
        functionName
      });
    } else {
      logger.log({
        level,
        message,
        functionName
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
    await fs.writeFile(logFilePath, '');
    logWithDetails.info("Archivo de logs limpiado correctamente.");
  } catch (err) {
    logWithDetails.error("Error al limpiar el archivo de logs:", err);
  }
};

module.exports = { logger, logWithDetails, clearLogs };