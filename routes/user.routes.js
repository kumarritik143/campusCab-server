const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid Email"),
    body("fullname.firstname")
      .isLength({ min: 3 })
      .withMessage("First name must be at least 3 characters long"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("phone").isMobilePhone().withMessage("Valid phone number is required"),
  ],
  userController.registerUser
);


router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid Email"),

    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  userController.loginUser
);

router.get('/profile',authMiddleware.authUser,userController.getUserProfile);

router.get(
  "/logout",
  authMiddleware.authUser,
  userController.logoutUser
);

router.post(
  "/send-otp",
  body("phone").isMobilePhone().withMessage("Invalid phone number"),
  userController.sendOtp
);

router.post("/verify-otp", userController.verifyOtp);

module.exports = router;
