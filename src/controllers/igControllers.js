const axios = require("axios");
const { logWithDetails } = require("../config/logger");
const { sendEmailController } = require("./emailControllers");
const accessToken = process.env.IG_API_TOKEN;
const instagramAccountId = process.env.IG_ACCOUNT_ID;
const admin = process.env.ADMIN_EMAIL;

const uploadMedia = async (imageUrl, caption, Model, ids) => {
  try {
    // Paso 1: Crear un objeto de medios
    const responseMedia = await axios.post(
      `https://graph.facebook.com/v17.0/${instagramAccountId}/media`,
      {
        image_url: imageUrl,
        caption: caption,
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
    logWithDetails.info("ID del medio:", mediaId);

    // Paso 2: Publicar el objeto de medios en Instagram
    const responsePublish = await axios.post(
      `https://graph.facebook.com/v17.0/${instagramAccountId}/media_publish`,
      {
        creation_id: mediaId,
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

    logWithDetails.info("Publicación exitosa:", responsePublish.data);
    if (Model && ids) {
      await Model.findOneAndUpdate(
        { _id: { $in: ids } },
        { postIG: true },
        { new: true }
      );
    }
    return true; // Return true on successful execution
  } catch (error) {
    logWithDetails.error(
      "Error al subir la imagen:",
      error.response ? error.response.data : error.message
    );
    console.log(error);
    return false; // Return false on error
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
      logWithDetails.info("ID del medio creado:", mediaId);
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
    logWithDetails.info("ID del carrusel creado:", carouselId);

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

    logWithDetails.info("Publicación de carrusel exitosa:", responsePublish.data);
  } catch (error) {
    logWithDetails.error(
      "Error al subir el carrusel:",
      error.response ? error.response.data : error.message
    );
  }
};

async function checkTokenExpiration(token) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`
    );
    const data = await response.json();

    const currentTime = Math.floor(Date.now() / 1000);
    const expiresAt = data.data?.expires_at;
    const daysUntilExpiration = expiresAt
      ? Math.floor((expiresAt - currentTime) / 86400)
      : "Never";

    if (daysUntilExpiration <= 10) {
      const emailText = `Quedan ${daysUntilExpiration} días para el vencimiento del token de Meta.`;
      const subjectText = `[ACTION REQUIRED] META token expiration`;
      await sendEmailController(admin, emailText, subjectText);
    }

    return {
      isValid: data.data?.is_valid || false,
      expiresAt,
      daysUntilExpiration: daysUntilExpiration,
      type: data.data?.type,
      app: data.data?.application,
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

module.exports = { uploadMedia, uploadCarouselMedia, checkTokenExpiration };
