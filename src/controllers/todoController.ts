import type { RequestHandler } from "express";
import type { createTodoModel } from "../models/todoModel.js";

type TodoModel = ReturnType<typeof createTodoModel>;

function todoNotFound(res: Parameters<RequestHandler>[1]) {
  return res.status(404).json({
    success: false,
    message: "Tugas tidak ditemukan!",
  });
}

export function createTodoController(todoModel: TodoModel) {
  const getTodos: RequestHandler = async (_req, res, next) => {
    try {
      const todos = await todoModel.getByUserId(Number(res.locals.userId));
      return res.status(200).json({ success: true, data: todos });
    } catch (error) {
      return next(error);
    }
  };

  const getTodoById: RequestHandler = async (req, res, next) => {
    try {
      const todo = await todoModel.getById(
        Number(req.params.id),
        Number(res.locals.userId),
      );
      if (!todo) return todoNotFound(res);
      return res.status(200).json({ success: true, data: todo });
    } catch (error) {
      return next(error);
    }
  };

  const createTodo: RequestHandler = async (req, res, next) => {
    try {
      const task = req.body.task as string;
      const userId = Number(res.locals.userId);
      const id = await todoModel.create(task, userId);
      return res.status(201).json({
        todo: { id, userId, task, isCompleted: false },
      });
    } catch (error) {
      return next(error);
    }
  };

  const updateTodo: RequestHandler = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const userId = Number(res.locals.userId);
      const { task, is_completed: isCompleted } = req.body;
      const changes: { task?: string; isCompleted?: boolean } = {};
      if (typeof task === "string") changes.task = task;
      if (typeof isCompleted === "boolean") {
        changes.isCompleted = isCompleted;
      }

      const affectedRows = await todoModel.update(id, userId, changes);
      if (affectedRows === 0 && !(await todoModel.getById(id, userId))) {
        return todoNotFound(res);
      }
      return res.status(200).json({
        success: true,
        message: "Tugas berhasil diperbarui!",
      });
    } catch (error) {
      return next(error);
    }
  };

  const patchTodo: RequestHandler = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const userId = Number(res.locals.userId);
      const { task, isCompleted } = req.body;
      const changes: { task?: string; isCompleted?: boolean } = {};
      if (typeof task === "string") changes.task = task;
      if (typeof isCompleted === "boolean") {
        changes.isCompleted = isCompleted;
      }

      await todoModel.update(id, userId, changes);
      const todo = await todoModel.getById(id, userId);
      if (!todo) return todoNotFound(res);
      return res.status(200).json({
        todo: {
          id: todo.id,
          userId: todo.user_id,
          task: todo.task,
          isCompleted:
            todo.is_completed === true ||
            todo.is_completed === 1 ||
            todo.is_completed === "1",
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  const deleteTodo: RequestHandler = async (req, res, next) => {
    try {
      const affectedRows = await todoModel.delete(
        Number(req.params.id),
        Number(res.locals.userId),
      );
      if (affectedRows === 0) return todoNotFound(res);
      return res.status(200).json({
        success: true,
        message: "Tugas berhasil dihapus!",
      });
    } catch (error) {
      return next(error);
    }
  };

  return { getTodos, getTodoById, createTodo, updateTodo, patchTodo, deleteTodo };
}
