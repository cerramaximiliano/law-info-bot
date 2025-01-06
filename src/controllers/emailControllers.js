const { logWithDetails } = require("../config/logger");
const { sendEmail } = require("../services/emailService");

// Controlador para enviar correos electrónicos
const sendEmailController = async (to, textBody, subject) => {
  // Validación de parámetros requeridos
  if (!to || !textBody) {
    logWithDetails.warn("Faltan parámetros requeridos para enviar el correo.");
    return { error: "Se requiere 'to' y 'textBody'" };
  }

  const htmlBody = textBody
    .split("\n")
    .map((line) => `<p>${line}</p>`)
    .join("\n");

  try {
    const result = await sendEmail(to, subject, htmlBody, textBody);
    logWithDetails.info(`Correo enviado exitosamente a ${to}`);
    return { message: "Correo enviado exitosamente", result };
  } catch (error) {
    logWithDetails.error(`Error al enviar correo a ${to}:`, error);
    return { error: "Error al enviar el correo", details: error.message };
  }
};

module.exports = { sendEmailController };
