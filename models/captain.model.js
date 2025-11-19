const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const captainSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [ 3, 'First name must be at least 3 characters long' ],
        },
        lastname: {
            type: String,
            minlength: [ 3, 'Last name must be at least 3 characters long' ],
        }
    },
    socketId:{
        type: String,
    },
    status:{
        type: String,
        enum: [ 'active', 'inactive' ],
        default: 'inactive',
    },
    vehicle: {
        NoPlate: {
            type: String,
            required: true,
            unique: true,
        },
        capacity:{
            type: Number,
            required: true,
            min: [ 1, 'Capacity must be at least 1' ],
        },
        type: {
            type: String,
            default: 'e-rickshaw' ,
        }
    },
    location:{
        lat:{
            type: Number,
        },
        lng:{
            type: Number,
        }
    }
})

captainSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
}

const captainModel = mongoose.model('captain', captainSchema);
module.exports = captainModel;