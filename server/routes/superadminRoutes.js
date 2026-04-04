import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireSuperadmin } from "../middleware/roleMiddleware.js";
import { applicationUpload } from "../middleware/applicationUpload.js";
import {
  registerSuperadmin,
  listSuperadminCompounds,
  listBranchAdmins,
  createBranchAdmin,
  assignCompoundAdmin,
} from "../controllers/superadminController.js";
import {
  submitApplication,
  inviteInfo,
  completeInviteRegistration,
  listApplications,
  approveApplication,
  rejectApplication,
  downloadApplicationFile,
} from "../controllers/superadminApplicationController.js";

const router = Router();

router.post("/setup", registerSuperadmin);
router.post(
  "/applications",
  applicationUpload.array("legalDocuments", 5),
  submitApplication
);
router.get("/invite/info", inviteInfo);
router.post("/invite/complete", completeInviteRegistration);

router.use(protect, requireSuperadmin);

router.get("/compounds", listSuperadminCompounds);
router.get("/admins", listBranchAdmins);
router.post("/admins", createBranchAdmin);
router.put("/compounds/:id/assign", assignCompoundAdmin);

router.get("/applications", listApplications);
router.post("/applications/:id/approve", approveApplication);
router.post("/applications/:id/reject", rejectApplication);
router.get("/applications/:id/files/:storedName", downloadApplicationFile);

export default router;
