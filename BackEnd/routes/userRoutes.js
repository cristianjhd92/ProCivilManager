const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  getAllUsers,       
  updateUserById,    
  deleteUserById     
} = require('../controllers/userController');
const auth = require('../middleware/authMiddleware'); 

// Rutas existentes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword); 
router.post('/reset-password/:token', resetPassword);

// rutas protegidas
router.get('/me', auth, getUserProfile);           
router.put('/me', auth, updateUserProfile);       
router.put('/me/password', auth, updateUserPassword);

// rutas para gestión de usuarios
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserById);
router.delete('/users/:id', deleteUserById);

module.exports = router;
