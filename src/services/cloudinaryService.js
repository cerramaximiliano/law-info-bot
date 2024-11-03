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
    console.log(error)
    logger.error("Error al subir la imagen:", error);
    throw new Error("Error al subir la imagen");
  }
};

const deleteImage = async (publicIds) => {
  try {
    // Verificar si publicIds es un array o un string y convertir a array si es necesario
    const ids = Array.isArray(publicIds) ? publicIds : [publicIds];
    
    const deletionResults = await Promise.all(
      ids.map(async (publicId) => {
        const result = await cloudinary.uploader.destroy(publicId);
        if (result.result === "ok") {
          logger.info(`Imagen eliminada con éxito: ${publicId}`);
        } else {
          logger.warn(`No se encontró la imagen con public_id: ${publicId}`);
        }
        return result;
      })
    );

    // Filtrar y retornar solo las eliminaciones exitosas si deseas un resultado final
    const successfulDeletions = deletionResults.filter(result => result.result === "ok");
    return successfulDeletions;
  } catch (error) {
    logger.error("Error al eliminar las imágenes:", error);
    throw new Error("Error al eliminar las imágenes");
  }
};

module.exports = {
  uploadImage,
  deleteImage,
};
