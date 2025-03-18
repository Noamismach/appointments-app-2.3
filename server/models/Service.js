const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    name: {
        type: String,
        required: [true, 'נא להזין שם שירות']
    },
    description: {
        type: String,
        trim: true
    },
    duration: {
        type: Number, // משך השירות בדקות
        required: [true, 'נא להזין משך שירות'],
        default: 60
    },
    price: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service; 