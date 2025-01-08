const { logWithDetails } = require('../config/logger');

const retryOperation = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      logWithDetails.error(`Error en intento ${i + 1}/${maxRetries}: ${error.message}`);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

const cleanupMemory = () => {
  if (global.gc) {
    global.gc();
    logWithDetails.info('Limpieza de memoria ejecutada');
  }
};

module.exports = {
  retryOperation,
  cleanupMemory
};