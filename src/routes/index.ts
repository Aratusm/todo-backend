import { Router } from "express";
import type { Pool } from "mysql2/promise";
import { createAuthController } from "../controllers/authController.js";
import { createTodoController } from "../controllers/todoController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { createTodoModel } from "../models/todoModel.js";
import { createUserModel } from "../models/userModel.js";
import { createApiRoutes } from "./api.js";
import { createAuthRoutes } from "./authRoutes.js";
import { createTodoRoutes } from "./todoRoutes.js";

export function createRoutes({
  pool,
  jwtSecret,
  jwtExpiresIn,
}: {
  pool: Pool;
  jwtSecret: string;
  jwtExpiresIn: number;
}) {
  const router = Router();
  const userModel = createUserModel(pool);
  const todoModel = createTodoModel(pool);
  const authController = createAuthController({
    userModel,
    jwtSecret,
    jwtExpiresIn,
  });
  const todoController = createTodoController(todoModel);

  router.use(createApiRoutes(pool));
  router.use("/auth", createAuthRoutes(authController));
  router.use("/todos", verifyToken(jwtSecret), createTodoRoutes(todoController));

  return router;
}
