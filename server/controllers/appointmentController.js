const Appointment = require('../models/Appointment');
const Business = require('../models/Business');
const Service = require('../models/Service');

// יצירת תור חדש
exports.createAppointment = async (req, res) => {
    try {
        const {
            businessId,
            serviceId,
            dateTime,
            customerName,
            customerPhone,
            customerEmail,
            notes
        } = req.body;

        // בדיקת תקינות התאריך והשעה
        const appointmentDate = new Date(dateTime);
        if (isNaN(appointmentDate) || appointmentDate < new Date()) {
            return res.status(400).json({
                status: 'error',
                message: 'נא לבחור תאריך ושעה תקינים'
            });
        }

        // בדיקה אם העסק קיים
        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // בדיקה אם השירות קיים (אם נבחר שירות)
        if (serviceId) {
            const service = await Service.findOne({
                _id: serviceId,
                business: businessId,
                isActive: true
            });
            
            if (!service) {
                return res.status(404).json({
                    status: 'error',
                    message: 'השירות לא נמצא או אינו זמין'
                });
            }
        }

        // בדיקה אם התור פנוי
        // בודקים שאין תור אחר באותה שעה
        const existingAppointment = await Appointment.findOne({
            business: businessId,
            dateTime: appointmentDate,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(400).json({
                status: 'error',
                message: 'התור כבר תפוס. נא לבחור שעה אחרת'
            });
        }

        // יצירת התור החדש
        const newAppointment = await Appointment.create({
            business: businessId,
            customer: req.user._id,
            service: serviceId,
            dateTime: appointmentDate,
            customerName,
            customerPhone,
            customerEmail: customerEmail || req.user.email,
            notes,
            status: 'pending'
        });

        res.status(201).json({
            status: 'success',
            appointment: newAppointment
        });
    } catch (err) {
        console.error('Create Appointment error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה ביצירת התור. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קבלת כל התורים של משתמש/עסק
exports.getAppointments = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        let query = {};
        const filter = {};

        // סינון לפי סטטוס
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }

        // סינון לפי טווח תאריכים
        if (req.query.start && req.query.end) {
            filter.dateTime = {
                $gte: new Date(req.query.start),
                $lt: new Date(req.query.end)
            };
        }

        // סוג המשתמש - בעל עסק או לקוח
        if (req.user.userType === 'business') {
            // קבלת המזהה של העסק
            const business = await Business.findOne({ owner: req.user._id });
            if (!business) {
                return res.status(404).json({
                    status: 'error',
                    message: 'העסק לא נמצא'
                });
            }
            filter.business = business._id;

            // חיפוש לפי שם או טלפון של לקוח
            if (req.query.search) {
                const searchRegex = new RegExp(req.query.search, 'i');
                query = {
                    ...filter,
                    $or: [
                        { customerName: searchRegex },
                        { customerPhone: searchRegex }
                    ]
                };
            } else {
                query = filter;
            }
        } else {
            // לקוח - מציג רק את התורים שלו
            filter.customer = req.user._id;
            query = filter;
        }

        // ביצוע השאילתה עם פאגינציה
        const appointments = await Appointment.find(query)
            .populate({
                path: 'service',
                select: 'name duration price'
            })
            .populate({
                path: 'business',
                select: 'name address phone'
            })
            .sort({ dateTime: 1 })
            .skip(skip)
            .limit(limit);

        // ספירת סך כל התורים
        const total = await Appointment.countDocuments(query);

        res.status(200).json({
            status: 'success',
            results: appointments.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            appointments
        });
    } catch (err) {
        console.error('Get Appointments error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בטעינת התורים. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קבלת תור לפי מזהה
exports.getAppointment = async (req, res) => {
    try {
        const appointmentId = req.params.id;

        const appointment = await Appointment.findById(appointmentId)
            .populate({
                path: 'service',
                select: 'name duration price'
            })
            .populate({
                path: 'business',
                select: 'name address phone cancellationPolicy'
            });

        if (!appointment) {
            return res.status(404).json({
                status: 'error',
                message: 'התור לא נמצא'
            });
        }

        // בדיקת הרשאות - האם התור שייך למשתמש או לעסק שלו
        if (
            req.user.userType === 'customer' && 
            appointment.customer.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                status: 'error',
                message: 'אין לך הרשאה לצפות בתור זה'
            });
        } else if (req.user.userType === 'business') {
            const business = await Business.findOne({ owner: req.user._id });
            if (
                !business || 
                appointment.business.toString() !== business._id.toString()
            ) {
                return res.status(403).json({
                    status: 'error',
                    message: 'אין לך הרשאה לצפות בתור זה'
                });
            }
        }

        res.status(200).json({
            status: 'success',
            appointment
        });
    } catch (err) {
        console.error('Get Appointment error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בטעינת התור. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// אישור תור
exports.confirmAppointment = async (req, res) => {
    try {
        const appointmentId = req.params.id;

        // וידוא שהמשתמש הוא בעל עסק
        if (req.user.userType !== 'business') {
            return res.status(403).json({
                status: 'error',
                message: 'רק בעלי עסקים יכולים לאשר תורים'
            });
        }

        // קבלת העסק של המשתמש
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // חיפוש התור
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                status: 'error',
                message: 'התור לא נמצא'
            });
        }

        // וידוא שהתור שייך לעסק הזה
        if (appointment.business.toString() !== business._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'אין לך הרשאה לשנות תור זה'
            });
        }

        // וידוא שהתור במצב 'ממתין לאישור'
        if (appointment.status !== 'pending') {
            return res.status(400).json({
                status: 'error',
                message: `לא ניתן לאשר תור במצב ${appointment.status}`
            });
        }

        // עדכון סטטוס התור
        appointment.status = 'confirmed';
        await appointment.save();

        // TODO: שליחת אימייל/SMS ללקוח על אישור התור

        res.status(200).json({
            status: 'success',
            message: 'התור אושר בהצלחה',
            appointment
        });
    } catch (err) {
        console.error('Confirm Appointment error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה באישור התור. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// ביטול תור
exports.cancelAppointment = async (req, res) => {
    try {
        const appointmentId = req.params.id;

        // חיפוש התור
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                status: 'error',
                message: 'התור לא נמצא'
            });
        }

        // בדיקת הרשאות
        let hasPermission = false;

        if (req.user.userType === 'customer') {
            // לקוח יכול לבטל רק את התורים שלו
            hasPermission = appointment.customer.toString() === req.user._id.toString();
        } else if (req.user.userType === 'business') {
            // בעל עסק יכול לבטל תורים בעסק שלו
            const business = await Business.findOne({ owner: req.user._id });
            if (business) {
                hasPermission = appointment.business.toString() === business._id.toString();
            }
        }

        if (!hasPermission) {
            return res.status(403).json({
                status: 'error',
                message: 'אין לך הרשאה לבטל תור זה'
            });
        }

        // וידוא שהתור במצב שניתן לביטול
        if (appointment.status === 'cancelled' || appointment.status === 'completed') {
            return res.status(400).json({
                status: 'error',
                message: `לא ניתן לבטל תור במצב ${appointment.status}`
            });
        }

        // עדכון סטטוס התור
        appointment.status = 'cancelled';
        await appointment.save();

        // TODO: שליחת אימייל/SMS על ביטול התור

        res.status(200).json({
            status: 'success',
            message: 'התור בוטל בהצלחה',
            appointment
        });
    } catch (err) {
        console.error('Cancel Appointment error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בביטול התור. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קבלת חלונות זמן פנויים
exports.getAvailableSlots = async (req, res) => {
    try {
        const { businessId, serviceId, date } = req.query;

        if (!businessId || !date) {
            return res.status(400).json({
                status: 'error',
                message: 'נא לספק מזהה עסק ותאריך'
            });
        }

        // חיפוש העסק
        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // חיפוש השירות אם צוין
        let service = null;
        if (serviceId) {
            service = await Service.findOne({
                _id: serviceId,
                business: businessId,
                isActive: true
            });
            
            if (!service) {
                return res.status(404).json({
                    status: 'error',
                    message: 'השירות לא נמצא או אינו זמין'
                });
            }
        }

        // חישוב משך השירות (בדקות)
        const serviceDuration = service ? service.duration : 60;

        // קביעת היום בשבוע (0-6, כאשר 0 הוא יום ראשון)
        const selectedDate = new Date(date);
        const dayOfWeek = selectedDate.getDay();

        // חיפוש שעות הפעילות של העסק ביום זה
        const workingHoursForDay = business.workingHours.find(wh => wh.day === dayOfWeek);

        // בדיקה אם העסק פתוח ביום זה
        if (!workingHoursForDay || !workingHoursForDay.isOpen) {
            return res.status(200).json({
                status: 'success',
                message: 'העסק סגור בתאריך זה',
                availableSlots: []
            });
        }

        // המרת שעות הפעילות למספרים (דקות מתחילת היום)
        const [openHour, openMinute] = workingHoursForDay.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = workingHoursForDay.closeTime.split(':').map(Number);
        
        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;

        // כל התורים ביום המבוקש
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

        const appointments = await Appointment.find({
            business: businessId,
            dateTime: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['pending', 'confirmed'] }
        }).sort({ dateTime: 1 });

        // חישוב כל החלונות האפשריים
        const slots = [];
        for (let minutes = openMinutes; minutes <= closeMinutes - serviceDuration; minutes += 15) {
            const hour = Math.floor(minutes / 60);
            const minute = minutes % 60;
            
            const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const slotDateTime = new Date(selectedDate);
            slotDateTime.setHours(hour, minute, 0, 0);

            // בדיקה אם החלון תפוס
            const isBooked = appointments.some(appointment => {
                const appointmentTime = new Date(appointment.dateTime);
                const appointmentEndTime = new Date(appointmentTime);
                
                // חישוב סוף התור בהתאם למשך השירות
                const appointmentServiceId = appointment.service;
                let appointmentDuration = 60; // ברירת מחדל
                
                if (appointmentServiceId) {
                    const appointmentService = service && service._id.toString() === appointmentServiceId.toString() 
                        ? service 
                        : null;
                    
                    appointmentDuration = appointmentService ? appointmentService.duration : 60;
                }
                
                appointmentEndTime.setMinutes(appointmentTime.getMinutes() + appointmentDuration);
                
                // החלון תפוס אם השעה המבוקשת בתוך טווח תור קיים
                return (
                    (slotDateTime >= appointmentTime && slotDateTime < appointmentEndTime) || 
                    (new Date(slotDateTime.getTime() + serviceDuration * 60000) > appointmentTime && 
                     slotDateTime < appointmentEndTime)
                );
            });

            if (!isBooked) {
                slots.push({
                    time: slotTime,
                    available: true
                });
            }
        }

        res.status(200).json({
            status: 'success',
            availableSlots: slots
        });
    } catch (err) {
        console.error('Get Available Slots error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בחיפוש החלונות הזמינים. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
}; 
