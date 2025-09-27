const mongoose = require('mongoose');

const ProyectoSchema = new mongoose.Schema({
  title: String,
  location: String,
  type: String,
  budget: Number,
  duration: Number,
  description: String,
  priority: String,
  startDate: Date,
  endDate: Date,
  email: String,  
  team: Array,
  status: String,
  progress: Number,
  createdAt: Date,
});

module.exports = mongoose.model('Proyectos', ProyectoSchema);
