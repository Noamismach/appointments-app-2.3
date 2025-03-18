const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// כל הנתיבים דורשים אימות משתמש
router.use(authMiddleware.protect);

// יצירת תור חדש
router.post('/', appointmentController.createAppointment);

// בדיקת זמינות תורים
router.get('/available-slots', appointmentController.getAvailableSlots);

// קבלת תורים (כל המשתמשים יכולים לראות את התורים שלהם, בעלי עסק יכולים לראות את כל התורים של העסק שלהם)
router.get('/', appointmentController.getAppointments);

// קבלת פרטי תור ספציפי
router.get('/:id', appointmentController.getAppointment);

// אישור תור (רק בעלי עסק)
router.patch('/:id/confirm',
    authMiddleware.restrictTo('business'),
    appointmentController.confirmAppointment
);

// ביטול תור (כל המשתמשים יכולים לבטל את התורים שלהם)
router.patch('/:id/cancel', appointmentController.cancelAppointment);

module.exports = router; 