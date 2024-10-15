const cloudinary = require("cloudinary").v2;
const { logger } = require("../config/logger");

// Configurar Cloudinary con tus credenciales
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Función para subir imágenes a Cloudinary
const uploadImage = async (imagePath, folder = "default_folder") => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder, // Organizar las imágenes en carpetas
    });
    logger.info(`URL de la imagen: ${result.secure_url}`);
    return result;
  } catch (error) {
    logger.error("Error al subir la imagen:", error);
    throw new Error("Error al subir la imagen");
  }
};

// Función para eliminar imágenes de Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok") {
      logger.info(`Imagen eliminada con éxito: ${publicId}`);
    } else {
      logger.warn(`No se encontró la imagen con public_id: ${publicId}`);
    }
  } catch (error) {
    logger.error("Error al eliminar la imagen:", error);
    throw new Error("Error al eliminar la imagen");
  }
};

module.exports = {
  uploadImage,
  deleteImage,
};
