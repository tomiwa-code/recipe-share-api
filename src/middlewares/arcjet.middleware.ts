import asyncHandler from "express-async-handler";
import aj from "../config/arcjet";

const arcjetMiddleware = asyncHandler(async (req, res, next) => {
  // Build proper Arcjet request object
  const arcjetRequest = {
    ip: req.ip,
    method: req.method,
    protocol: req.protocol,
    host: req.hostname,
    path: req.path,
    headers: req.headers,
    cookies: req.headers.cookie || "",
    query: req.query ? JSON.stringify(req.query) : "",
    requested: Date.now(),
  };

  const decision = await aj.protect(arcjetRequest, { requested: 5 });

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }

    res.status(403).json({ error: "Access denied" });
    return;
  }

  next();
});

export default arcjetMiddleware;
