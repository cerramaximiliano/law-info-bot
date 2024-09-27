const mongoose = require("mongoose");

const feesValues = new mongoose.Schema({
  resolucion: String,
  fecha: Date,
  monto: Number,
  periodo: String,
  vigencia: Date,
  organization: String,
  type: String,
});

const FeesModel = mongoose.model("feesValues", feesValues);
module.exports = FeesModel;
