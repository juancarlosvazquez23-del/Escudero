const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  cuerpo: { type: String },
  imgUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('News', NewsSchema);
