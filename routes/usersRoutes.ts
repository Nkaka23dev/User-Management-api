import express from "express";
import {
  signin,
  signup,
  forgotPassword,
  resetPassword,
  googleSignin,
  refreshToken,
  update,
  getCurrentUser,
  changePassword,
  requestVerification,
  verify2fa,
} from "../controllers/users";
import { Authentication } from "../middlewares/authentication";
import Validator from "../middlewares/Validator";
const router: any = express.Router({ mergeParams: true });

router.post("/signin", signin);
// router.post("/2fa", twoFactorAuth);
router.post("/signup", Validator("user"), signup);
router.post("/refresh-token", refreshToken);
router.post("/current-user", Authentication, getCurrentUser);
router.post("/forgot-password", forgotPassword);
router.post("/change-password", Authentication, changePassword);
router.post("/reset-password", resetPassword);
router.post("/update", Authentication, Validator("user"), update);
router.post("/google", googleSignin);
router.post("/verify", Authentication, requestVerification);
router.post("/verify2fa", verify2fa);
export default router;
