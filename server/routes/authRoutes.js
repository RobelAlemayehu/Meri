import { Router } from "express";
import {
  registerAdmin,
  loginAdmin,
  getMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/me", protect, getMe);

export default router;
