const userModel = require('../models/user.model');



module.exports.createUser = async ({ firstname, lastname, email, phone, password }) => {
  if (!firstname || !email || !password || !phone) {
    throw new Error("All fields are required");
  }

  const user = await userModel.create({
    fullname: { firstname, lastname },
    email,
    phone,
    password,
  });

  return user;
};

module.exports.getOtp = (length = 4) => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};
