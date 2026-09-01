import { Router } from "express";
import { createOrder, listOrders, getOrder, simulateStockDrop, updateDeliveryStatus } from "../controllers/ordersController.js";

const router = Router();

router.post("/", createOrder);
router.get("/", listOrders);
router.get("/:id", getOrder);
router.post("/:id/simulate-stock-drop", simulateStockDrop);
router.patch("/:id/delivery-status", updateDeliveryStatus);

export default router;