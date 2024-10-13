const axios = require("axios");
const { logger } = require("../config/logger");
const accessToken = process.env.IG_API_TOKEN;
const instagramAccountId = process.env.IG_ACCOUNT_ID;

const getInstagramPosts = async () => {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&access_token=${accessToken}`
    );
    const data = response.data;
    return data.data;
  } catch (error) {
    console.log(error)
    logger.error("Error al obtener los posts:", error);
  }
};

const uploadMedia = async (imageUrl) => {
  try {
    const response = await axios.post(
      `https://graph.instagram.com/v21.0/${instagramAccountId}/media`,
      {
        image_url: imageUrl,
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
    console.log("ID del medio:", response.data.id);
    return response.data.id;
  } catch (error) {
    console.log(error)
    console.error(
      "Error al subir el medio:",
      error.response ? error.response.data : error.message
    );
  }
};

const createPost = async (mediaId) => {
  try {
    const response = await axios.post(
      `https://graph.instagram.com/me/{instagram_account_id}/media_publish?creation_id=${mediaId}&access_token=${accessToken}`
    );
    logger.info("Post publicado:", response.data);
  } catch (error) {
    console.log(error);
    logger.error("Error al publicar el post:", error);
  }
};

module.exports = { getInstagramPosts, uploadMedia, createPost };
