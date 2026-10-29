import { Router } from "express";
import type { createAuthController } from "../controllers/authController.js";
import { validateLogin, validateRegister } from "../middlewares/validator.js";

type AuthController = ReturnType<typeof createAuthController>;

export function createAuthRoutes(controller: AuthController) {
  const router = Router();
  router.post("/register", validateRegister, controller.register);
  router.post("/login", validateLogin, controller.login);
  return router;
}
