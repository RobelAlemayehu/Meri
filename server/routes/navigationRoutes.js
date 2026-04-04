import { Router } from "express";
import {
  postOutdoorProgress,
  postOutdoorRoute,
} from "../controllers/navigationController.js";

const router = Router();

router.post("/outdoor-progress", postOutdoorProgress);
router.post("/outdoor-route", postOutdoorRoute);

export default router;
