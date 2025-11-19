const captainModel = require("../models/captain.model");

module.exports.createCaptain = async ({
  firstname,
  lastname,
  NoPlate,
  capacity,
}) => {
  if (!firstname || !NoPlate || !capacity) {
    throw new Error("All fields are required");
  }
  const captain = await captainModel.create({
    fullname: {
      firstname,
      lastname,
    },
    vehicle: {
      NoPlate,
      capacity,
    },
  });
  return captain;
};
