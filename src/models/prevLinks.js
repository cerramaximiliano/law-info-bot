const mongoose = require("mongoose");

const prevSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  descripcion: { type: String, required: true },
  link: { type: String, required: true, unique: true },
  norma: { type: String, required: true, unique: true },
  scraped: { type: Boolean, default: false },
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

const PrevLinks = mongoose.model("Prev", prevSchema);

module.exports = PrevLinks;
