const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true
    },
    username: {
        type: String,
        default: null
    },
    firstName: {
        type: String,
        default: null
    },
    lastName: {
        type: String,
        default: null
    },
    category: {
        type: String,
        required: false
    },
    quantity: {
        type: String,
        required: false
    },
    deliveryDate: {
        type: String,
        required: false
    },
    deliveryTime: {
        type: String,
        required: false
    },
    cardMessage: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    phone: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
orderSchema.index({ userId: 1, date: 1 });
orderSchema.index({ date: 1, time: 1 });

// Update the updatedAt field before saving
orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);