import { Router } from "express";
import { postChatQuery } from "../controllers/chatController.js";

const router = Router();

router.post("/query", postChatQuery);

export default router;
