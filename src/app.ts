import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import type { Pool } from "mysql2/promise";
import { createRoutes } from "./routes/index.js";

type JwtExpiresIn = number;

type AppOptions = {
  pool: Pool;
  jwtSecret: string;
  jwtExpiresIn?: JwtExpiresIn;
  frontendOrigins?: string[];
};

export function createApp({
  pool,
  jwtSecret,
  jwtExpiresIn = 60 * 60,
  frontendOrigins = ["http://localhost:3000"],
}: AppOptions) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A MySQL pool is required.");
  }
  if (typeof jwtSecret !== "string" || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || frontendOrigins.includes(origin)) {
          return callback(null, true);
        }
        const error = Object.assign(
          new Error("Origin tidak diizinkan."),
          { status: 403 },
        );
        return callback(error);
      },
    }),
  );
  app.use(express.json({ limit: "10kb" }));

  app.get("/", (_req, res) =>
    res.status(200).json({
      success: true,
      message: "Backend Todo Praktikum Berjalan Mulus!",
    }),
  );
  app.use(
    "/api",
    createRoutes({
      pool,
      jwtSecret,
      jwtExpiresIn,
    }),
  );

  const notFoundHandler: RequestHandler = (req, res) =>
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} tidak ditemukan!`,
    });
  app.use(notFoundHandler);

  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const apiError = error as Error & {
      code?: string;
      status?: number;
    };

    if (apiError.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Username atau email sudah digunakan.",
      });
    }
    if (apiError.status) {
      return res.status(apiError.status).json({
        success: false,
        message: apiError.message,
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  };
  app.use(errorHandler);

  return app;
}
