const { sendEmail } = require("../services/emailService");
const logger = require("../utils/logger");

// Controlador para enviar correos electrónicos
const sendEmailController = async (to, textBody, subject) => {
  // Validación de parámetros requeridos
  if (!to || !textBody) {
    logger.warn("Faltan parámetros requeridos para enviar el correo.");
    return { error: "Se requiere 'to' y 'textBody'" };
  }

  const htmlBody = `<p>${textBody}</p>`; // Convierte el texto a HTML básico

  try {
    const result = await sendEmail(to, subject, htmlBody, textBody);
    logger.info(`Correo enviado exitosamente a ${to}`);
    return { message: "Correo enviado exitosamente", result };
  } catch (error) {
    logger.error(`Error al enviar correo a ${to}:`, error);
    return { error: "Error al enviar el correo", details: error.message };
  }
};

module.exports = { sendEmailController };
