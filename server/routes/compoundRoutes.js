import { Router } from "express";
import {
  getCompounds,
  getMyCompounds,
  getCompoundDestinations,
  getCompoundMapForLeaflet,
  getCompoundById,
  createCompound,
  updateCompound,
  deleteCompound,
} from "../controllers/compoundController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireSuperadmin } from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/my", protect, getMyCompounds);
router.get("/", getCompounds);
router.get("/:id/destinations", getCompoundDestinations);
router.get("/:id/map", getCompoundMapForLeaflet);
router.get("/:id", getCompoundById);
router.post("/", protect, requireSuperadmin, createCompound);
router.put("/:id", protect, updateCompound);
router.delete("/:id", protect, deleteCompound);

export default router;
