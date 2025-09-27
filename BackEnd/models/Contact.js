const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true
  },
  company: {
    type: String
  },
  phone: {
    type: String
  },
  projectType: {
    type: String,
    enum: ['residencial', 'comercial', 'industrial', 'infraestructura', '']
  },
  message: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Contact', contactSchema);
