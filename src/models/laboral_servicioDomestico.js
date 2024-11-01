const mongoose = require("mongoose");

// Esquema para los valores de cada tipo
const tipoSchema = new mongoose.Schema({
  tipo: String,
  valorHora: Number,
  valorMensual: Number,
});

// Esquema principal para la categoría
const categoriaSchema = new mongoose.Schema({
  categoria: String,
  tipos: [tipoSchema],
});

// Esquema principal para la fecha
const fechaSchema = new mongoose.Schema({
  fecha: Date,
  categorias: [categoriaSchema],
  notifiedByTelegram: { type: Boolean, default: false }, // Indica si fue notificado por el bot de Telegram
  notifiedByWhatsApp: { type: Boolean, default: false },
  postIG: { type: Boolean, default: false },
  notificationDate: { type: Date, default: null },
});

// Modelo para la colección
const ServicioDomestico = mongoose.model("laboral_domestico", fechaSchema);

module.exports = ServicioDomestico;
