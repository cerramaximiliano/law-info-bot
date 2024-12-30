const express = require("express");
const router = express.Router();
const { logger } = require("../config/logger");
const { findUnnotifiedFees } = require("../controllers/feesControllers");
const { generateScreenshot } = require("../utils/generateImages");
const { cleanupLocalFile } = require("../utils/manageFiles");
const { uploadImage, deleteImage } = require("../services/cloudinaryService");
const {
  uploadMedia,
  checkTokenExpiration,
} = require("../controllers/igControllers");
const { newFeesPosts } = require("../posts/instagramPosts");
const FeesModel = require("../models/feesValues");
const FeesValuesCaba = require("../models/feesValuesCaba");
const {
  getIdArray,
  generateTelegramMessage,
  extractMontoAndPeriodo,
} = require("../utils/formatText");
const {
  notifyUnnotifiedFees,
} = require("../controllers/telegramBotControllers");

const accessToken = process.env.IG_API_TOKEN;

router.get("/update-fees", async (req, res) => {
  try {
    const { force = false } = req.query;

    const { daysUntilExpiration } = await checkTokenExpiration(accessToken);
    if (!daysUntilExpiration || daysUntilExpiration <= 0) {
      logger.info(`Token Meta expirado.`);
      return;
    }

    logger.info("Iniciada tarea de notificación de fees");
    const response = {
      pjn: { telegram: false, instagram: false },
      caba: { telegram: false, instagram: false },
      message: "No hay fees nuevos para notificar",
    };

    const findOptions = force ? {} : { notified: false, postIG: false };

    // Notificar fees Nación
    const fees = await findUnnotifiedFees(FeesModel, findOptions);
    if (fees?.length > 0) {
      logger.info("Hay fees para notificar");
      const ids = getIdArray(fees);
      const message = generateTelegramMessage(
        "Actualización UMA PJN Ley 27.423",
        fees
      );
      const array = extractMontoAndPeriodo(fees);
      const htmlCode = newFeesPosts(array, "2", ["UMA", "Ley Nº 27.423 "]);
      const generatedFile = await generateScreenshot(htmlCode);
      const localFilePath = `./src/files/${generatedFile}`;
      const image = await uploadImage(localFilePath);
      const imageId = image.public_id;
      const caption =
        "Nuevos valores UMA Ley Nº 27.423 \n#UMA #PoderJudicial #Aranceles #Honorarios\n\n";

      const igSuccess = await uploadMedia(
        image.secure_url,
        caption,
        FeesModel,
        ids
      );
      await deleteImage(imageId);
      await cleanupLocalFile(localFilePath);
      const telegramSuccess = await notifyUnnotifiedFees(message, ids, "fees");

      response.pjn.telegram = telegramSuccess;
      response.pjn.instagram = igSuccess;
      response.message = "Fees actualizados";
    }

    // Notificar fees CABA
    const feesCABA = await findUnnotifiedFees(FeesValuesCaba, findOptions);
    if (feesCABA?.length > 0) {
      logger.info("Hay feesCaba para notificar");
      const ids = getIdArray(feesCABA);
      const message = generateTelegramMessage(
        "Actualización UMA CABA Ley 5.134",
        feesCABA
      );
      const array = extractMontoAndPeriodo(feesCABA);
      const htmlCode = newFeesPosts(array, "2", ["UMA CABA", "Ley 5.134"]);

      const generatedFile = await generateScreenshot(htmlCode);
      const localFilePath = `./src/files/${generatedFile}`;
      const image = await uploadImage(localFilePath);
      const imageId = image.public_id;
      const caption =
        "Nuevos valores UMA CABA Ley Nº 5.134 \n#UMA #PoderJudicialCABA #Aranceles #Honorarios\n\n";

      const igSuccess = await uploadMedia(
        image.secure_url,
        caption,
        FeesValuesCaba,
        ids
      );
      await deleteImage(imageId);
      await cleanupLocalFile(localFilePath);
      const telegramSuccess = await notifyUnnotifiedFees(
        message,
        ids,
        "feesCaba"
      );

      response.caba.telegram = telegramSuccess;
      response.caba.instagram = igSuccess;
      response.message = "Fees actualizados";
    }

    res.status(200).json(response);
  } catch (error) {
    logger.error("Error en notificación de fees nuevos:", error);
    res.status(500).json({
      error: "Error al procesar la actualización de fees",
      details: error.message,
    });
  }
});

module.exports = router;
