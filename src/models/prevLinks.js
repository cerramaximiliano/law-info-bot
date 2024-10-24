const mongoose = require("mongoose");

const prevSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  descripcion: { type: String, required: true },
  link: { type: String, required: true, unique: true },
  scraped: { type: Boolean, default: false },
});

const PrevLinks = mongoose.model("Prev", prevSchema);

module.exports = PrevLinks;
