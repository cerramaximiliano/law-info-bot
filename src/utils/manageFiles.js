const fs = require("fs").promises;
const fss = require("fs");
const path = require("path");
const { logger } = require("../config/logger");

const cleanDirectory = async (directoryPath) => {
  try {
    // Lee todos los archivos en la carpeta especificada
    const files = await fs.readdir(directoryPath);

    // Recorre cada archivo y elimínalo
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      await fs.unlink(filePath);
      logger.info(`Archivo eliminado: ${filePath}`);
    }

    logger.info("La carpeta ha sido limpiada correctamente.");
  } catch (error) {
    logger.error("Error al limpiar la carpeta:", error);
  }
};

const loadFile = (filePath) => {
  try {
    const data = fss.readFileSync(filePath, "utf8");
    return data;
  } catch (err) {
    logger.error("Error leyendo el archivo: ", err);
    return null;
  }
};

module.exports = { cleanDirectory, loadFile };
