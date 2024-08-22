const mongoose = require("mongoose");

// Definir el esquema del curso
const cursesSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: Date,
  type: String,
  link: String,
});

// Crear el modelo de Curso
const Courses = mongoose.model("Course", cursesSchema);
module.exports = Courses;
