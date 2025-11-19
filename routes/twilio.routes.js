const express = require('express');
const router = express.Router();
const controller = require('../controllers/twilio.controller');

// POST route for Twilio to start IVR
router.post('/ivr', controller.ivr);

// POST route to handle keypad input
router.post('/handle-input', controller.handleInput);

// Optional: trigger the call from frontend
router.post("/call-driver", controller.callDriver);

// router.post("/voice", controller.voice);

module.exports = router;




