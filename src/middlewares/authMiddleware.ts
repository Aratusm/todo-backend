import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

export function verifyToken(jwtSecret: string): RequestHandler {
  return (req, res, next) => {
    const [scheme, token, ...extra] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token || extra.length > 0) {
      return res.status(401).json({
        success: false,
        message: "Akses ditolak. Token tidak ditemukan!",
      });
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      const userId =
        typeof payload === "object" && payload !== null
          ? Number(payload.sub)
          : Number.NaN;
      if (!Number.isSafeInteger(userId) || userId < 1) {
        throw new Error("Invalid token subject");
      }
      res.locals.userId = userId;
      return next();
    } catch {
      return res.status(401).json({
        success: false,
        message: "Akses ditolak. Token tidak valid atau sudah kedaluwarsa!",
      });
    }
  };
}
