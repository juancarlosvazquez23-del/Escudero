const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  autor: { type: String },
  carrera: { type: String },
  semestre: { type: String },
  genero: { type: String },
  descripcion: { type: String },
  archivoUrl: { type: String },
  disponible: { type: Boolean, default: true }
}, { timestamps: true });

// Índice de texto para búsquedas rápidas
BookSchema.index({ titulo: 'text', autor: 'text', carrera: 'text', genero: 'text' });

module.exports = mongoose.model('Book', BookSchema);
