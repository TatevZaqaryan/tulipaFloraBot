const mongoose = require('mongoose');

const descriptionSchema = new mongoose.Schema({
    hy: { type: String },
    en: { type: String },
    ru: { type: String }
}, { _id: false }); // Do not create an _id for this subdocument

const priceRangeSchema = new mongoose.Schema({
    min: { type: Number },
    max: { type: mongoose.Schema.Types.Mixed } // Use Mixed if it can be string or number
}, { _id: false });

const categorySchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    priceRange: { type: priceRangeSchema },
    description: { type: descriptionSchema },
    imagePath: { type: String }
}, { _id: false }); // Do not create an _id for this subdocument


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
        type: categorySchema, // Reference the new category schema
        required: false // Set to true if a category is always required
    },
    quantity: {
        type: String, // Consider if this should be a Number
        required: false
    },
    deliveryDate: {
        type: Date, // Change to Date type to store actual Date objects
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

orderSchema.index({ userId: 1, deliveryDate: 1 }); // Changed from 'date' to 'deliveryDate'
orderSchema.index({ deliveryDate: 1, deliveryTime: 1 }); // Changed from 'date' to 'deliveryDate'

// Update the updatedAt field before saving
orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);