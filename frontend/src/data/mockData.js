/**
 * Mock data for local UI development.
 * Every field here mirrors what the real Node backend will return once
 * Part 2 (Express API) is wired up — components should not need to change
 * shape when we swap this for real fetch() calls, only the data source.
 */

export const merchant = {
  id: "merch_razor_test_01",
  name: "Merchant Test Account",
  timezone: "Asia/Kolkata",
};

export const spendVelocity = {
  spentToday: 42800,
  dailyCap: 500000,
  currency: "INR",
};

// Renamed from "Guardrail Gates" to plain language for the merchant-facing UI.
export const safetyChecks = [
  { key: "price", label: "Price matches your listing", status: "pass" },
  { key: "stock", label: "Item is reserved, no double-selling", status: "pass" },
  { key: "speed", label: "Not too many orders too fast", status: "pass" },
  { key: "payment", label: "Payment confirmed by Razorpay", status: "pending" },
];

export const incomingRequest = {
  agentId: "agent_bot_alpha_8821",
  sku: "prod_cable_441",
  productName: "Industrial High-Load Grid Coupling",
  quantity: 50,
  quote: 8496.0,
  compliance: ["CE Certified", "RoHS Compliant"],
};

export const auditLog = [
  { time: "22:46:58", type: "info", text: "New order created — tx_geo_99341" },
  { time: "22:47:00", type: "info", text: "Stock reserved — prod_cable_441" },
  { time: "22:47:01", type: "alert", text: "Blocked: buyer tried to change the price" },
  { time: "22:47:02", type: "info", text: "Reservation safely released" },
];

// New: buyer / order records for the "Customer Orders" expandable card.
export const orders = [
  {
    id: "ord_8821_01",
    buyerAgentId: "agent_bot_alpha_8821",
    customerName: "Nordwind Grid Services GmbH",
    product: "Industrial High-Load Grid Coupling",
    quantity: 50,
    amount: 8496.0,
    purchasedAt: "2026-08-24T22:47:02+05:30",
    paymentStatus: "confirmed",
    deliveryStatus: "processing",
    contact: {
      email: "procurement@nordwind-grid.de",
      phone: "+49 30 1234 5678",
    },
    address: {
      line1: "Rehbergstraße 12",
      city: "Berlin",
      region: "Berlin",
      postalCode: "13585",
      country: "Germany",
    },
  },
  {
    id: "ord_5512_02",
    buyerAgentId: "agent_bot_shop_5512",
    customerName: "Sakura Retail Autobuy KK",
    product: "Compact UPS Backup Unit 600VA",
    quantity: 12,
    amount: 21480.0,
    purchasedAt: "2026-08-24T19:12:44+05:30",
    paymentStatus: "confirmed",
    deliveryStatus: "shipped",
    contact: {
      email: "orders@sakuraretail.jp",
      phone: "+81 3 4455 6677",
    },
    address: {
      line1: "3-1 Marunouchi",
      city: "Chiyoda, Tokyo",
      region: "Tokyo",
      postalCode: "100-0005",
      country: "Japan",
    },
  },
  {
    id: "ord_9931_03",
    buyerAgentId: "agent_bot_alpha_8821",
    customerName: "Nordwind Grid Services GmbH",
    product: "Weatherproof Junction Box 40A",
    quantity: 30,
    amount: 5670.0,
    purchasedAt: "2026-08-23T14:05:10+05:30",
    paymentStatus: "confirmed",
    deliveryStatus: "delivered",
    contact: {
      email: "procurement@nordwind-grid.de",
      phone: "+49 30 1234 5678",
    },
    address: {
      line1: "Rehbergstraße 12",
      city: "Berlin",
      region: "Berlin",
      postalCode: "13585",
      country: "Germany",
    },
  },
];