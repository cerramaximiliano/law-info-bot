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

const uploadCarouselMedia = async (imageUrls, caption) => {
  try {
    const mediaIds = [];

    // Paso 1: Crear objetos de medios individuales para cada imagen
    for (const imageUrl of imageUrls) {
      const responseMedia = await axios.post(
        `https://graph.facebook.com/v17.0/${instagramAccountId}/media`,
        {
          image_url: imageUrl, // URL de la imagen
          is_carousel_item: true, // Marcar como parte del carrusel
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
      logger.info("ID del medio creado:", mediaId);
      mediaIds.push(mediaId);
    }

    // Paso 2: Crear el carrusel con los objetos de medios creados
    const responseCarousel = await axios.post(
      `https://graph.facebook.com/v17.0/${instagramAccountId}/media`,
      {
        media_type: "CAROUSEL",
        children: mediaIds, // IDs de los medios creados
        caption: caption, // Descripción que acompañará a la publicación del carrusel
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

    const carouselId = responseCarousel.data.id;
    logger.info("ID del carrusel creado:", carouselId);

    // Paso 3: Publicar el objeto de carrusel en Instagram
    const responsePublish = await axios.post(
      `https://graph.facebook.com/v17.0/${instagramAccountId}/media_publish`,
      {
        creation_id: carouselId, // El ID del carrusel creado en el paso anterior
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

    logger.info("Publicación de carrusel exitosa:", responsePublish.data);
  } catch (error) {
    logger.error(
      "Error al subir el carrusel:",
      error.response ? error.response.data : error.message
    );
  }
};

module.exports = { uploadMedia, uploadCarouselMedia };
