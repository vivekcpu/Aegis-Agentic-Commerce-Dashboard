import { v4 as uuid } from "uuid";

/**
 * Generates (or forwards) a correlation ID for every request and attaches
 * it to req.correlationId. This is what lets you trace one AI buyer's
 * request all the way from ingestion -> guardrails -> Razorpay -> audit
 * log, per context.md's observability requirement — it must be created
 * here, at the edge, not somewhere deeper in the call stack, or requests
 * that fan out internally lose the thread.
 */
export function correlationId(req, res, next) {
  const incoming = req.headers["x-correlation-id"];
  req.correlationId = incoming || uuid();
  res.setHeader("x-correlation-id", req.correlationId);
  next();
}

/**
 * Structured JSON request logger. Every line includes the correlation ID
 * so logs from this service can be grepped/joined with the AI service's
 * logs for the same request.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        level: "info",
        correlationId: req.correlationId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - start,
      })
    );
  });
  next();
}
