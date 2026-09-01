import "dotenv/config";
import express from "express";
import cors from "cors";

import { correlationId, requestLogger } from "./middleware/correlationId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { startReservationCleanup } from "./services/reservationCleanup.js";

import ordersRouter from "./routes/orders.js";
import webhooksRouter from "./routes/webhooks.js";
import miscRouter from "./routes/misc.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());
app.use(correlationId);
app.use(requestLogger);

app.get("/healthz", (req, res) => res.json({ status: "ok" }));

app.use("/api/orders", ordersRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api", miscRouter);

// Must be registered last — Express only treats a 4-arg function as
// error-handling middleware if it's added after every other route.
app.use(errorHandler);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(JSON.stringify({ level: "info", msg: `Aegis backend listening on port ${port}` }));
  startReservationCleanup();
});
