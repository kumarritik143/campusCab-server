const captainModel = require("../models/captain.model");
const captainService = require("../services/captain.service");
const { validationResult } = require("express-validator");

module.exports.registerCaptain = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { fullname, vehicle } = req.body;
    const { firstname, lastname } = fullname || {};
    const { NoPlate, capacity } = vehicle || {};

    const captain = await captainService.createCaptain({
      firstname,
      lastname,
      NoPlate,
      capacity,
    });

    return res.status(201).json({
      message: "Captain registered successfully",
      captain,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
 