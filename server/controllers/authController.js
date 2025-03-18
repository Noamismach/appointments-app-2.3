const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');

// יצירת טוקן JWT
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// הרשמה
exports.register = async (req, res) => {
    try {
        const { fullName, email, password, userType } = req.body;

        // בדיקה אם המשתמש כבר קיים
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'כתובת האימייל כבר קיימת במערכת'
            });
        }

        // יצירת משתמש חדש
        const newUser = await User.create({
            fullName,
            email,
            password,
            userType,
            // קוד אימות משתמש אקראי
            verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
            verificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 שעות
        });

        // יצירת עסק אם המשתמש הוא בעל עסק
        if (userType === 'business') {
            // יצירת קוד עסק ייחודי בן 6 ספרות
            let businessCode;
            let isUnique = false;
            
            console.log('מתחיל ליצור קוד עסק ייחודי...');
            
            // וידוא שאין כפילות בקוד העסק
            while (!isUnique) {
                businessCode = Math.floor(100000 + Math.random() * 900000).toString();
                console.log('קוד עסק שנוצר:', businessCode);
                
                const existingBusiness = await Business.findOne({ businessCode });
                if (!existingBusiness) {
                    isUnique = true;
                    console.log('קוד העסק ייחודי ותקין');
                } else {
                    console.log('קוד העסק כבר קיים, מנסה קוד חדש');
                }
            }
            
            const newBusiness = await Business.create({
                owner: newUser._id,
                businessCode: businessCode,
                name: `העסק של ${fullName}`,
                type: 'עסק חדש',
                address: 'לא הוגדר',
                phone: 'לא הוגדר',
                email: email,
                workingHours: [
                    { day: 0, isOpen: true, openTime: '09:00', closeTime: '18:00' },
                    { day: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
                    { day: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
                    { day: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
                    { day: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
                    { day: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
                    { day: 6, isOpen: false, openTime: '00:00', closeTime: '00:00' }
                ]
            });
            
            console.log('עסק נוצר בהצלחה עם קוד עסק:', newBusiness.businessCode);
        }

        // TODO: שליחת אימייל אימות

        // יצירת טוקן
        const token = signToken(newUser._id);

        // הוספת פרטי עסק לתשובה אם זה משתמש עסקי
        let businessDetails = null;
        if (userType === 'business') {
            const business = await Business.findOne({ owner: newUser._id });
            if (business) {
                businessDetails = {
                    id: business._id,
                    name: business.name,
                    businessCode: business.businessCode
                };
            }
        }

        // שליחת התגובה
        res.status(201).json({
            status: 'success',
            token,
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                userType: newUser.userType,
                business: businessDetails
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בתהליך ההרשמה. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// התחברות
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // בדיקה שהמשתמש הזין אימייל וסיסמה
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'נא להזין אימייל וסיסמה'
            });
        }

        // חיפוש המשתמש בבסיס הנתונים
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.checkPassword(password, user.password))) {
            return res.status(401).json({
                status: 'error',
                message: 'אימייל או סיסמה שגויים'
            });
        }

        // יצירת טוקן
        const token = signToken(user._id);

        // הוספת פרטי עסק לתשובה אם זה משתמש עסקי
        let businessDetails = null;
        if (user.userType === 'business') {
            const business = await Business.findOne({ owner: user._id });
            if (business) {
                businessDetails = {
                    id: business._id,
                    name: business.name,
                    businessCode: business.businessCode
                };
            }
        }

        // שליחת התגובה
        res.status(200).json({
            status: 'success',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                userType: user.userType,
                business: businessDetails
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בתהליך ההתחברות. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// אימות אימייל
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        const user = await User.findOne({
            email,
            verificationCode: code,
            verificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'קוד האימות שגוי או שפג תוקפו'
            });
        }

        // עדכון סטטוס אימות
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // יצירת טוקן חדש
        const token = signToken(user._id);

        // שליחת התגובה
        res.status(200).json({
            status: 'success',
            message: 'האימייל אומת בהצלחה',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                userType: user.userType
            }
        });
    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בתהליך האימות. נסה שנית מאוחר יותר.',
            error: err.message
        });
    }
};

// קבלת פרטי המשתמש הנוכחי
exports.getMe = async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            user: {
                id: req.user._id,
                fullName: req.user.fullName,
                email: req.user.email,
                userType: req.user.userType,
                phone: req.user.phone,
                isVerified: req.user.isVerified
            }
        });
    } catch (err) {
        console.error('Get Me error:', err);
        res.status(500).json({
            status: 'error',
            message: 'אירעה שגיאה בקבלת פרטי המשתמש.',
            error: err.message
        });
    }
}; 