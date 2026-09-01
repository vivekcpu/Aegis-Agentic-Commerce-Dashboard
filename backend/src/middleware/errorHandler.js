/**
 * Custom error type for anything a guardrail rejects (bad price, out of
 * stock, velocity limit hit, etc). Controllers throw this; the handler
 * below turns it into the "safe, standardized machine exception code"
 * that context.md's Graceful Failure Handler requires — the AI buyer
 * always gets clean JSON back, never a raw 500 or a stack trace.
 */
export class GuardrailError extends Error {
  constructor(code, message, statusCode = 422) {
    super(message);
    this.code = code; // e.g. 'PRICE_MUTATION_ATTACK', 'OUT_OF_STOCK', 'VELOCITY_LIMIT'
    this.statusCode = statusCode;
  }
}

export function errorHandler(err, req, res, _next) {
  const correlationId = req.correlationId;

  if (err instanceof GuardrailError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
      correlationId,
    });
  }

  // Anything unexpected: log the real error server-side, but never leak
  // internals (stack traces, SQL, etc.) to an external caller.
  console.error(
    JSON.stringify({
      level: "error",
      correlationId,
      msg: err.message,
      stack: err.stack,
    })
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our end. No charge was made.",
    },
    correlationId,
  });
}
