const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// נתיבי אימות שאינם דורשים הרשאות
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/contact', userController.submitContactForm);

// נתיבים שדורשים אימות משתמש
router.use(authMiddleware.protect);

// נתיבי פרופיל משתמש
router.get('/me', authController.getMe);
router.patch('/update-profile', userController.updateProfile);
router.patch('/update-password', userController.updatePassword);

// נתיבי מועדפים
router.post('/favorites/:businessId', userController.addFavorite);
router.delete('/favorites/:businessId', userController.removeFavorite);
router.get('/favorites', userController.getFavorites);

// צפייה בהיסטוריית תורים של המשתמש
router.get('/appointments', userController.getAppointments);

module.exports = router; 