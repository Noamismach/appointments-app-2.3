const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    },
    dateTime: {
        type: Date,
        required: [true, 'נא לבחור תאריך ושעה לתור']
    },
    customerName: {
        type: String,
        required: [true, 'נא להזין שם']
    },
    customerPhone: {
        type: String,
        required: [true, 'נא להזין מספר טלפון']
    },
    customerEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    notes: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// אינדקס למהירות חיפוש
appointmentSchema.index({ business: 1, dateTime: 1 });
appointmentSchema.index({ customer: 1, dateTime: 1 });
appointmentSchema.index({ status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment; 