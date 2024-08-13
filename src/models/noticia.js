const mongoose = require('mongoose');

const noticiaSchema = new mongoose.Schema({
  titulo: { type: String, required: true, unique: true },
  resumen: String,
  enlace: { type: String, required: true, unique: true },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Noticia', noticiaSchema);