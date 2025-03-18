const express = require('express');
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// נתיבים שדורשים אימות משתמש
router.use(authMiddleware.protect);

// נתיבי פרופיל עסק
router.get('/profile', businessController.getBusinessProfile);
router.patch('/profile', businessController.updateBusinessProfile);

// נתיבי שירותים
router.post('/services', businessController.createService);
router.get('/services', businessController.getServices);
router.patch('/services/:id', businessController.updateService);
router.delete('/services/:id', businessController.deleteService);

// נתיב שירותים ספציפי לעסק מסוים (נגיש לכל המשתמשים המאומתים)
router.get('/:businessId/services', businessController.getServices);

// נתיב סטטיסטיקות - מוגבל לבעלי עסק בלבד
router.get('/statistics', 
  authMiddleware.restrictTo('business'), 
  businessController.getStatistics
);

// נתיב חיפוש עסקים - פתוח לכל המשתמשים המאומתים
router.get('/search', businessController.searchBusinesses);

// נתיב לקביעת בעלות על עסק באמצעות קוד - לכל המשתמשים המאומתים
router.post('/claim-ownership', businessController.claimBusinessOwnership);

module.exports = router; 