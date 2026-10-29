import { Router } from "express";
import type { createTodoController } from "../controllers/todoController.js";
import {
  validatePatchTodo,
  validateTodo,
  validateTodoId,
  validateUpdateTodo,
} from "../middlewares/validator.js";

type TodoController = ReturnType<typeof createTodoController>;

export function createTodoRoutes(controller: TodoController) {
  const router = Router();
  router.get("/", controller.getTodos);
  router.get("/:id", validateTodoId, controller.getTodoById);
  router.post("/", validateTodo, controller.createTodo);
  router.put(
    "/:id",
    validateTodoId,
    validateUpdateTodo,
    controller.updateTodo,
  );
  router.patch(
    "/:id",
    validateTodoId,
    validatePatchTodo,
    controller.patchTodo,
  );
  router.delete("/:id", validateTodoId, controller.deleteTodo);
  return router;
}
