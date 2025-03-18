const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'נא להזין שם מלא']
    },
    email: {
        type: String,
        required: [true, 'נא להזין כתובת אימייל'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'נא להזין סיסמה'],
        minlength: 6,
        select: false
    },
    userType: {
        type: String,
        enum: ['customer', 'business'],
        required: [true, 'נא לבחור סוג משתמש']
    },
    phone: {
        type: String,
        trim: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: String,
    verificationExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// הצפנת סיסמה לפני שמירה
userSchema.pre('save', async function(next) {
    // אם הסיסמה לא שונתה - המשך
    if (!this.isModified('password')) return next();
    
    // הצפנת הסיסמה עם salt ברמה 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// בדיקת סיסמה
userSchema.methods.checkPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 