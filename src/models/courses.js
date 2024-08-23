const mongoose = require("mongoose");

// Definir el esquema del curso
const cursesSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: Date,
  type: String,
  link: String,
  price: String,
  siteId: String,
  notifiedByTelegram: { type: Boolean, default: false }, // Indica si fue notificado por el bot de Telegram
  notificationDate: { type: Date, default: null },
});

// Crear el modelo de Curso
const Courses = mongoose.model("Course", cursesSchema);
module.exports = Courses;
