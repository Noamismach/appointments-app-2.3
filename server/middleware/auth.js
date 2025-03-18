const jwt = require('jsonwebtoken');
const User = require('../models/User');

// בדיקת אימות
exports.protect = async (req, res, next) => {
    try {
        // 1) בדיקה האם קיים טוקן
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'אינך מחובר! נא להתחבר כדי לגשת למשאב זה'
            });
        }

        // 2) אימות הטוקן
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) בדיקה שהמשתמש עדיין קיים
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({
                status: 'error',
                message: 'המשתמש המשויך לטוקן זה כבר אינו קיים'
            });
        }

        // שימור המשתמש הנוכחי בבקשה
        req.user = currentUser;
        next();
    } catch (err) {
        return res.status(401).json({
            status: 'error',
            message: 'אירעה שגיאה באימות. נא להתחבר מחדש.'
        });
    }
};

// הגבלת גישה לפי סוג משתמש
exports.restrictTo = (...userTypes) => {
    return (req, res, next) => {
        if (!userTypes.includes(req.user.userType)) {
            return res.status(403).json({
                status: 'error',
                message: 'אין לך הרשאה לבצע פעולה זו'
            });
        }
        next();
    };
}; 