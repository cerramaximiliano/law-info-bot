const mongoose = require("mongoose");

const legalSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  descripcion: { type: String, required: true },
  link: { type: String, required: true, unique: true },
  norma: { type: String, required: true, unique: true },
  scraped: { type: Boolean, default: false },
  type: { type: String, required: true },
  data: [
    {
      tipo: String,
      importe: String,
      order: Number,
      fecha: String,
    },
  ],
  notifiedByTelegram: { type: Boolean, default: false }, // Indica si fue notificado por el bot de Telegram
  notifiedByWhatsApp: { type: Boolean, default: false },
  postIG: { type: Boolean, default: false },
  notificationDate: { type: Date, default: null },
});

const LegalLinks = mongoose.model("Legal", legalSchema);

module.exports = LegalLinks;
