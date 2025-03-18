const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// ייבוא הנתיבים
const userRoutes = require('./routes/userRoutes');
const businessRoutes = require('./routes/businessRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

// טעינת משתני סביבה מקובץ .env
dotenv.config();

// יצירת אפליקציית Express
const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// הגדרת תיקיית static
app.use(express.static(path.join(__dirname, '..')));

// הגדרת נתיבי ה-API
app.use('/api/users', userRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/appointments', appointmentRoutes);

// נתיב ברירת מחדל - משרת את האפליקציית הלקוח
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// טיפול בשגיאות
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'שגיאת שרת פנימית',
        error: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
});

// התחברות למסד הנתונים והפעלת השרת
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/torim';

mongoose
    .connect(DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        ssl: true,
        tls: true,
        tlsAllowInvalidCertificates: false
    })
    .then(() => {
        console.log('Connected to MongoDB successfully');
        
        // הפעלת השרת
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

module.exports = app; 