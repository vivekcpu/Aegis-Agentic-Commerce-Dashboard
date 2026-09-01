import { Router } from "express";
import { handleRazorpayWebhook } from "../controllers/webhookController.js";

const router = Router();

router.post("/razorpay", handleRazorpayWebhook);

export default router;
