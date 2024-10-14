const axios = require("axios");
const { logger } = require("../config/logger");
const accessToken = process.env.IG_API_TOKEN;
const instagramAccountId = process.env.IG_ACCOUNT_ID;

  
const uploadMedia = async (imageUrl, caption) => {
  try {
    // Paso 1: Crear un objeto de medios
    const responseMedia = await axios.post(
      `https://graph.facebook.com/v17.0/${instagramAccountId}/media`,
      {
        image_url: imageUrl, // URL de la imagen
        caption: caption // Descripción que acompañará a la imagen
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          access_token: accessToken,
        },
      }
    );

    const mediaId = responseMedia.data.id;
    logger.info("ID del medio:", mediaId);

    // Paso 2: Publicar el objeto de medios en Instagram
    const responsePublish = await axios.post(
      `https://graph.facebook.com/v17.0/${instagramAccountId}/media_publish`,
      {
        creation_id: mediaId, // El ID del medio creado en el paso anterior
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          access_token: accessToken,
        },
      }
    );

    logger.info("Publicación exitosa:", responsePublish.data);
  } catch (error) {
    logger.error(
      "Error al subir la imagen:",
      error.response ? error.response.data : error.message
    );
  }
};

module.exports = { uploadMedia };
