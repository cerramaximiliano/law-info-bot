const mongoose = require("mongoose");

const feesSchema = new mongoose.Schema({
  resolucion: String,
  fecha: Date,
  monto: String,
  periodo: String,
  vigenciaFecha: Date,
  link: String,
  organization: String,
});

const FeesValues = mongoose.model("FeesValues", umaSchema);

module.exports = FeesValues;
