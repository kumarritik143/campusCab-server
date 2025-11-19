const express = require("express");
const router = express.Router();  
const {body,query} = require("express-validator");
const rideController = require("../controllers/ride.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post('/create',
    authMiddleware.authUser,
    body('pickup').isString().withMessage('invalid pickup address'),
    body('destination').isString().withMessage('invalid destination address'),
    body('vehicleType').isString().withMessage('invalid vehicle type'), 

    rideController.createRide

)

router.get('/get-fare',
    authMiddleware.authUser,
    query('pickup').isString().withMessage('invalid pickup address'),
    query('destination').isString().withMessage('invalid destination address'),

    rideController.getFare
)


module.exports = router;