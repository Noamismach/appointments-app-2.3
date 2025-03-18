const Business = require('../models/Business');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// קבלת פרטי עסק של המשתמש הנוכחי
exports.getBusinessProfile = async (req, res) => {
    try {
        const business = await Business.findOne({ owner: req.user._id })
            .populate('services');

        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        res.status(200).json({
            status: 'success',
            business
        });
    } catch (err) {
        console.error('Get Business Profile error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בטעינת פרטי העסק. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// עדכון פרטי עסק
exports.updateBusinessProfile = async (req, res) => {
    try {
        const {
            name,
            type,
            description,
            address,
            phone,
            email,
            workingHours,
            cancellationPolicy
        } = req.body;

        // בדיקה שהמשתמש הוא בעל עסק
        if (req.user.userType !== 'business') {
            return res.status(403).json({
                status: 'error',
                message: 'רק בעלי עסקים יכולים לעדכן פרטי עסק'
            });
        }

        // חיפוש העסק של המשתמש
        let business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // עדכון פרטי העסק
        business.name = name || business.name;
        business.type = type || business.type;
        business.description = description !== undefined ? description : business.description;
        business.address = address || business.address;
        business.phone = phone || business.phone;
        business.email = email || business.email;
        
        if (workingHours && Array.isArray(workingHours)) {
            // וידוא שיש פרטים לכל ימי השבוע
            const updatedWorkingHours = [];
            for (let day = 0; day < 7; day++) {
                const dayData = workingHours.find((wh) => wh.day === day);
                if (dayData) {
                    updatedWorkingHours.push({
                        day,
                        isOpen: dayData.isOpen,
                        openTime: dayData.openTime,
                        closeTime: dayData.closeTime,
                        breakStart: dayData.breakStart,
                        breakEnd: dayData.breakEnd
                    });
                } else {
                    // שימוש בנתונים קיימים אם יש, אחרת ברירת מחדל
                    const existingDayData = business.workingHours.find((wh) => wh.day === day);
                    if (existingDayData) {
                        updatedWorkingHours.push(existingDayData);
                    } else {
                        updatedWorkingHours.push({
                            day,
                            isOpen: day < 6, // פתוח בימים 0-5 (א'-ו')
                            openTime: '09:00',
                            closeTime: '18:00'
                        });
                    }
                }
            }
            business.workingHours = updatedWorkingHours;
        }

        if (cancellationPolicy) {
            business.cancellationPolicy = cancellationPolicy;
        }

        // שמירת השינויים
        await business.save();

        res.status(200).json({
            status: 'success',
            message: 'פרטי העסק עודכנו בהצלחה',
            business
        });
    } catch (err) {
        console.error('Update Business Profile error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בעדכון פרטי העסק. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// יצירת שירות חדש
exports.createService = async (req, res) => {
    try {
        const { name, description, duration, price } = req.body;

        // בדיקה שהמשתמש הוא בעל עסק
        if (req.user.userType !== 'business') {
            return res.status(403).json({
                status: 'error',
                message: 'רק בעלי עסקים יכולים ליצור שירותים'
            });
        }

        // חיפוש העסק של המשתמש
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // יצירת השירות החדש
        const newService = await Service.create({
            business: business._id,
            name,
            description,
            duration: duration || 60,
            price: price || 0,
            isActive: true
        });

        // הוספת השירות לרשימת השירותים של העסק
        business.services.push(newService._id);
        await business.save();

        res.status(201).json({
            status: 'success',
            service: newService
        });
    } catch (err) {
        console.error('Create Service error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה ביצירת השירות. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// עדכון שירות
exports.updateService = async (req, res) => {
    try {
        const serviceId = req.params.id;
        const { name, description, duration, price, isActive } = req.body;

        // בדיקה שהמשתמש הוא בעל עסק
        if (req.user.userType !== 'business') {
            return res.status(403).json({
                status: 'error',
                message: 'רק בעלי עסקים יכולים לעדכן שירותים'
            });
        }

        // חיפוש העסק של המשתמש
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // חיפוש השירות
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({
                status: 'error',
                message: 'השירות לא נמצא'
            });
        }

        // וידוא שהשירות שייך לעסק הזה
        if (service.business.toString() !== business._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'אין לך הרשאה לעדכן שירות זה'
            });
        }

        // עדכון השירות
        service.name = name || service.name;
        service.description = description !== undefined ? description : service.description;
        service.duration = duration || service.duration;
        service.price = price !== undefined ? price : service.price;
        service.isActive = isActive !== undefined ? isActive : service.isActive;

        // שמירת השינויים
        await service.save();

        res.status(200).json({
            status: 'success',
            message: 'השירות עודכן בהצלחה',
            service
        });
    } catch (err) {
        console.error('Update Service error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בעדכון השירות. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// מחיקת שירות
exports.deleteService = async (req, res) => {
    try {
        const serviceId = req.params.id;

        // בדיקה שהמשתמש הוא בעל עסק
        if (req.user.userType !== 'business') {
            return res.status(403).json({
                status: 'error',
                message: 'רק בעלי עסקים יכולים למחוק שירותים'
            });
        }

        // חיפוש העסק של המשתמש
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // חיפוש השירות
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({
                status: 'error',
                message: 'השירות לא נמצא'
            });
        }

        // וידוא שהשירות שייך לעסק הזה
        if (service.business.toString() !== business._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'אין לך הרשאה למחוק שירות זה'
            });
        }

        // בדיקה אם יש תורים עתידיים לשירות זה
        const futureAppointments = await Appointment.find({
            service: serviceId,
            dateTime: { $gt: new Date() },
            status: { $in: ['pending', 'confirmed'] }
        });

        if (futureAppointments.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'לא ניתן למחוק שירות עם תורים עתידיים. עדכן את השירות לקוי פעיל במקום.',
                appointments: futureAppointments.length
            });
        }

        // מחיקת השירות
        await Service.findByIdAndDelete(serviceId);

        // הסרת השירות מרשימת השירותים של העסק
        business.services = business.services.filter(
            (id) => id.toString() !== serviceId
        );
        await business.save();

        res.status(200).json({
            status: 'success',
            message: 'השירות נמחק בהצלחה'
        });
    } catch (err) {
        console.error('Delete Service error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה במחיקת השירות. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קבלת כל השירותים של העסק
exports.getServices = async (req, res) => {
    try {
        // חיפוש העסק לפי מזהה
        const businessId = req.params.businessId || null;
        
        let business;
        
        if (businessId) {
            // אם צוין מזהה עסק ספציפי
            business = await Business.findById(businessId);
        } else if (req.user.userType === 'business') {
            // אם לא צוין מזהה וזה בעל עסק, מחזיר את השירותים של העסק שלו
            business = await Business.findOne({ owner: req.user._id });
        } else {
            return res.status(400).json({
                status: 'error',
                message: 'נא לספק מזהה עסק'
            });
        }
        
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // קבלת כל השירותים של העסק
        const services = await Service.find({ business: business._id }).sort({ name: 1 });

        res.status(200).json({
            status: 'success',
            results: services.length,
            services
        });
    } catch (err) {
        console.error('Get Services error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בטעינת השירותים. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קבלת סטטיסטיקות
exports.getStatistics = async (req, res) => {
    try {
        // וידוא שהמשתמש הוא בעל עסק
        if (req.user.userType !== 'business') {
            return res.status(403).json({
                status: 'error',
                message: 'רק בעלי עסקים יכולים לצפות בסטטיסטיקות'
            });
        }
        
        // חיפוש העסק של המשתמש
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }
        
        const businessId = business._id;
        const now = new Date();
        
        // תאריכי התחלה וסיום עבור היום, השבוע והחודש
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // יום ראשון של השבוע הנוכחי
        startOfWeek.setHours(0, 0, 0, 0);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // ספירת תורים
        const todayAppointments = await Appointment.countDocuments({
            business: businessId,
            dateTime: { $gte: startOfDay, $lt: now },
            status: { $in: ['confirmed', 'completed'] }
        });
        
        const pendingAppointments = await Appointment.countDocuments({
            business: businessId,
            status: 'pending'
        });
        
        const weeklyAppointments = await Appointment.countDocuments({
            business: businessId,
            dateTime: { $gte: startOfWeek, $lt: now },
            status: { $in: ['confirmed', 'completed'] }
        });
        
        const monthlyAppointments = await Appointment.countDocuments({
            business: businessId,
            dateTime: { $gte: startOfMonth, $lt: now },
            status: { $in: ['confirmed', 'completed'] }
        });
        
        // סטטיסטיקות נוספות
        const totalAppointments = await Appointment.countDocuments({
            business: businessId
        });
        
        const cancelledAppointments = await Appointment.countDocuments({
            business: businessId,
            status: 'cancelled'
        });
        
        const upcomingAppointments = await Appointment.countDocuments({
            business: businessId,
            dateTime: { $gt: now },
            status: { $in: ['pending', 'confirmed'] }
        });
        
        res.status(200).json({
            status: 'success',
            todayAppointments,
            pendingAppointments,
            weeklyAppointments,
            monthlyAppointments,
            totalAppointments,
            cancelledAppointments,
            upcomingAppointments
        });
    } catch (err) {
        console.error('Get Statistics error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בטעינת הסטטיסטיקות. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// חיפוש עסקים
exports.searchBusinesses = async (req, res) => {
    try {
        const { query, type, page = 1, limit = 10 } = req.query;
        
        const searchQuery = {};
        
        // חיפוש לפי טקסט
        if (query) {
            const regex = new RegExp(query, 'i');
            searchQuery.$or = [
                { name: regex },
                { description: regex },
                { type: regex }
            ];
        }
        
        // סינון לפי סוג עסק
        if (type) {
            searchQuery.type = new RegExp(type, 'i');
        }
        
        // חיפוש עסקים עם פאגינציה
        const skip = (page - 1) * limit;
        
        const businesses = await Business.find(searchQuery)
            .select('name type description address phone')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ name: 1 });
            
        // ספירת סך כל העסקים
        const total = await Business.countDocuments(searchQuery);
        
        res.status(200).json({
            status: 'success',
            results: businesses.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            businesses
        });
    } catch (err) {
        console.error('Search Businesses error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בחיפוש העסקים. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קביעת בעלות על עסק באמצעות קוד ייחודי
exports.claimBusinessOwnership = async (req, res) => {
    try {
        const { businessCode } = req.body;
        
        // וידוא שקיים קוד עסק
        if (!businessCode) {
            return res.status(400).json({
                status: 'error',
                message: 'נא להזין קוד עסק'
            });
        }
        
        // בדיקה אם המשתמש כבר בעל עסק
        const existingBusiness = await Business.findOne({ owner: req.user._id });
        if (existingBusiness) {
            return res.status(400).json({
                status: 'error',
                message: 'המשתמש כבר קשור לעסק קיים'
            });
        }
        
        // חיפוש העסק על פי הקוד
        const business = await Business.findOne({ businessCode });
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'לא נמצא עסק עם הקוד שהוזן'
            });
        }
        
        // בדיקה אם העסק כבר יש לו בעלים
        if (business.owner.toString() !== req.user._id.toString() && business.owner !== null) {
            return res.status(403).json({
                status: 'error',
                message: 'העסק כבר קשור למשתמש אחר'
            });
        }
        
        // עדכון בעלות העסק
        business.owner = req.user._id;
        await business.save();
        
        // עדכון סוג המשתמש לבעל עסק אם צריך
        if (req.user.userType !== 'business') {
            await User.findByIdAndUpdate(req.user._id, { userType: 'business' });
        }
        
        res.status(200).json({
            status: 'success',
            message: 'הבעלות על העסק נקבעה בהצלחה',
            business
        });
    } catch (err) {
        console.error('Claim Business Ownership error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בקביעת בעלות העסק. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
}; 