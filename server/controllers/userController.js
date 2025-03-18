const User = require('../models/User');
const Business = require('../models/Business');
const Appointment = require('../models/Appointment');
const bcrypt = require('bcryptjs');

// עדכון פרופיל משתמש
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        
        // בדיקה שהמשתמש לא מנסה לשנות שדות שאינם מורשים
        const allowedFields = { name, phone, email };
        const updateData = {};

        for (const [key, value] of Object.entries(allowedFields)) {
            if (value !== undefined) {
                updateData[key] = value;
            }
        }
        
        // אם יש ניסיון לעדכן אימייל, נבדוק שהוא לא קיים כבר
        if (email && email !== req.user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    status: 'error',
                    message: 'כתובת האימייל כבר בשימוש'
                });
            }
        }

        // עדכון המשתמש
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -verificationCode -verificationExpires');

        res.status(200).json({
            status: 'success',
            message: 'פרופיל המשתמש עודכן בהצלחה',
            user: updatedUser
        });
    } catch (err) {
        console.error('Update Profile error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בעדכון הפרופיל. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// עדכון סיסמה
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // בדיקה שהסיסמאות נשלחו
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'אנא ספק את הסיסמה הנוכחית והסיסמה החדשה'
            });
        }

        // קבלת המשתמש עם הסיסמה מהמסד נתונים
        const user = await User.findById(req.user._id).select('+password');

        // בדיקת התאמת הסיסמה הנוכחית
        const isCorrectPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isCorrectPassword) {
            return res.status(401).json({
                status: 'error',
                message: 'הסיסמה הנוכחית שגויה'
            });
        }

        // עדכון הסיסמה החדשה
        user.password = newPassword;
        await user.save(); // ה-pre-save hook יבצע הצפנה של הסיסמה

        res.status(200).json({
            status: 'success',
            message: 'הסיסמה עודכנה בהצלחה'
        });
    } catch (err) {
        console.error('Update Password error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בעדכון הסיסמה. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// הוספת עסק למועדפים
exports.addFavorite = async (req, res) => {
    try {
        const businessId = req.params.businessId;

        // בדיקה שהעסק קיים
        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                status: 'error',
                message: 'העסק לא נמצא'
            });
        }

        // עדכון רשימת המועדפים של המשתמש
        const user = await User.findById(req.user._id);
        
        // בדיקה שהעסק לא נמצא כבר במועדפים
        if (user.favorites.includes(businessId)) {
            return res.status(400).json({
                status: 'success',
                message: 'העסק כבר נמצא ברשימת המועדפים שלך'
            });
        }

        // הוספת העסק למועדפים
        user.favorites.push(businessId);
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'העסק נוסף למועדפים בהצלחה'
        });
    } catch (err) {
        console.error('Add Favorite error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בהוספת העסק למועדפים. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// הסרת עסק מהמועדפים
exports.removeFavorite = async (req, res) => {
    try {
        const businessId = req.params.businessId;

        // עדכון רשימת המועדפים של המשתמש
        const user = await User.findById(req.user._id);
        
        // בדיקה שהעסק נמצא במועדפים
        if (!user.favorites.includes(businessId)) {
            return res.status(400).json({
                status: 'error',
                message: 'העסק לא נמצא ברשימת המועדפים שלך'
            });
        }

        // הסרת העסק מהמועדפים
        user.favorites = user.favorites.filter(
            (id) => id.toString() !== businessId
        );
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'העסק הוסר מהמועדפים בהצלחה'
        });
    } catch (err) {
        console.error('Remove Favorite error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בהסרת העסק מהמועדפים. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קבלת רשימת העסקים המועדפים
exports.getFavorites = async (req, res) => {
    try {
        // קבלת המשתמש עם רשימת המועדפים
        const user = await User.findById(req.user._id).populate({
            path: 'favorites',
            select: 'name type description address phone'
        });

        res.status(200).json({
            status: 'success',
            results: user.favorites.length,
            favorites: user.favorites
        });
    } catch (err) {
        console.error('Get Favorites error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בטעינת רשימת המועדפים. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קבלת התורים של המשתמש
exports.getAppointments = async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
        
        const query = { user: req.user._id };
        
        // סינון לפי סטטוס התור
        if (status) {
            query.status = status;
        }
        
        // סינון לפי טווח תאריכים
        if (startDate || endDate) {
            query.dateTime = {};
            if (startDate) {
                query.dateTime.$gte = new Date(startDate);
            }
            if (endDate) {
                query.dateTime.$lte = new Date(endDate);
            }
        }
        
        // ביצוע הפאגינציה
        const skip = (page - 1) * limit;
        
        // קבלת התורים עם פרטים על העסק והשירות
        const appointments = await Appointment.find(query)
            .populate({
                path: 'business',
                select: 'name address phone'
            })
            .populate({
                path: 'service',
                select: 'name duration price'
            })
            .sort({ dateTime: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        // ספירת סך הכל תורים
        const total = await Appointment.countDocuments(query);
        
        res.status(200).json({
            status: 'success',
            results: appointments.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            appointments
        });
    } catch (err) {
        console.error('Get User Appointments error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בטעינת התורים. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// שליחת טופס צור קשר
exports.submitContactForm = async (req, res) => {
    try {
        const { fullName, email, message } = req.body;

        // כאן בפרויקט אמיתי היינו שולחים את ההודעה למערכת ניהול לקוחות או לאימייל
        // לצורך הדוגמה, נחזיר פשוט תשובה חיובית

        res.status(200).json({
            status: 'success',
            message: 'הודעתך התקבלה בהצלחה'
        });
    } catch (err) {
        console.error('Contact form error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בשליחת הטופס. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
}; 