const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  nombres: { type: String, required: true },
  apellidos: { type: String, required: true },
  matricula: { type: String },
  carrera: { type: String },
  semestre: { type: String },
  genero: { type: String },
  actividad: { type: String },
  fecha: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
