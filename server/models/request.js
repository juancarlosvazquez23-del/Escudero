const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  requesterName: String,
  ts: { type: Date, default: Date.now },
  returned: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);
