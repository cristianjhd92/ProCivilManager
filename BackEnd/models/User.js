const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    phone:     { type: String },
    password:  { type: String, required: true },
    role:      { type: String, enum: ['cliente', 'lider de obra', 'admin'], default: 'cliente' },
    token:     { type: String, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    status: { type: Boolean, default: true } // true = activa, false = bloqueada
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
