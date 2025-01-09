const fs = require("fs").promises;
const fss = require("fs");
const path = require("path");
const { logWithDetails } = require("../config/logger");

const cleanDirectory = async (directoryPath) => {
  try {
      const files = await fs.readdir(directoryPath);
      
      for (const file of files) {
          const filePath = path.join(directoryPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.isDirectory()) {
              await cleanDirectory(filePath); // Recursión para subdirectorios
              await fs.rmdir(filePath);
          } else {
              await fs.unlink(filePath);
          }
          logWithDetails.info(`Eliminado: ${filePath}`);
      }
  } catch (error) {
      logWithDetails.error("Error al limpiar:", error);
  }
};

const loadFile = (filePath) => {
  try {
    const data = fss.readFileSync(filePath, "utf8");
    return data;
  } catch (err) {
    logWithDetails.error("Error leyendo el archivo: ", err);
    return null;
  }
};


async function cleanupLocalFile(filePath) {
  try {
    await fs.unlink(filePath);
    logWithDetails.info(`Archivo eliminado correctamente: ${filePath}`);
    return true;
  } catch (error) {
    logWithDetails.error(`Error eliminando archivo: ${filePath}:`, error);
    return false;
  }
}

module.exports = { cleanDirectory, loadFile, cleanupLocalFile };
