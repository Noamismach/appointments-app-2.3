const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    businessCode: {
        type: String,
        unique: true,
        required: true,
        minlength: 6,
        maxlength: 6
    },
    name: {
        type: String,
        required: [true, 'נא להזין שם עסק']
    },
    type: {
        type: String,
        required: [true, 'נא להזין סוג עסק']
    },
    description: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true,
        required: [true, 'נא להזין כתובת']
    },
    phone: {
        type: String,
        trim: true,
        required: [true, 'נא להזין מספר טלפון']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    logo: {
        type: String,
        default: ''
    },
    workingHours: [{
        day: {
            type: Number, // 0-6 (יום ראשון עד שבת)
            required: true
        },
        isOpen: {
            type: Boolean,
            default: true
        },
        openTime: {
            type: String,
            default: '09:00'
        },
        closeTime: {
            type: String,
            default: '18:00'
        },
        breakStart: String,
        breakEnd: String
    }],
    services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    }],
    cancellationPolicy: {
        type: String,
        default: 'ביטול תור פחות מ-24 שעות לפני מועד התור עלול לגרור חיוב.'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Business = mongoose.model('Business', businessSchema);

module.exports = Business; 