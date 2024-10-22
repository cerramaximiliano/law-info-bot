const mongoose = require("mongoose");


const feesValues = new mongoose.Schema({
  resolucion: String,
  fecha: Date,
  monto: Number,
  periodo: String,
  vigencia: Date,
  organization: String,
  type: String,
  notifiedByTelegram: { type: Boolean, default: false }, // Indica si fue notificado por el bot de Telegram
  notificationDate: { type: Date, default: null },
});


const FeesValuesBA = mongoose.model("feesValuesBA", feesValues);

module.exports = FeesValuesBA;
