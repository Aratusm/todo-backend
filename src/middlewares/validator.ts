import type { Request, RequestHandler } from "express";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalid(message: string): RequestHandler {
  return (_req, res) => {
    res.status(400).json({ success: false, message });
  };
}

function isObjectBody(req: Request): req is Request & {
  body: Record<string, unknown>;
} {
  return typeof req.body === "object" && req.body !== null && !Array.isArray(req.body);
}

export const validateRegister: RequestHandler = (req, res, next) => {
  if (!isObjectBody(req)) {
    return invalid("Data registrasi tidak valid.")(req, res, next);
  }

  const { username, email, password } = req.body;
  if (
    typeof username !== "string" ||
    username.trim().length < 3 ||
    username.trim().length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Username harus berisi 3 sampai 100 karakter.",
    });
  }
  if (
    typeof email !== "string" ||
    email.length > 150 ||
    !EMAIL_PATTERN.test(email.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Format email tidak valid.",
    });
  }
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      success: false,
      message: "Password harus minimal 8 karakter dan maksimal 72 byte.",
    });
  }
  return next();
};

export const validateLogin: RequestHandler = (req, res, next) => {
  if (!isObjectBody(req)) {
    return invalid("Data login tidak valid.")(req, res, next);
  }
  const { identifier, password } = req.body;
  if (
    typeof identifier !== "string" ||
    identifier.trim().length === 0 ||
    identifier.length > 150 ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Username/email dan password wajib diisi.",
    });
  }
  return next();
};

export const validateTodo: RequestHandler = (req, res, next) => {
  const task = isObjectBody(req) ? req.body.task : undefined;
  if (
    typeof task !== "string" ||
    task.trim().length === 0 ||
    task.trim().length > 255
  ) {
    return res.status(400).json({
      success: false,
      message: "Task wajib diisi dan maksimal 255 karakter.",
    });
  }
  req.body.task = task.trim();
  return next();
};

export const validateTodoId: RequestHandler = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "ID todo tidak valid.",
    });
  }
  return next();
};

export const validateUpdateTodo: RequestHandler = (req, res, next) => {
  if (!isObjectBody(req)) {
    return invalid("Data update tidak valid.")(req, res, next);
  }
  const { task, is_completed: isCompleted } = req.body;
  if (task === undefined && isCompleted === undefined) {
    return res.status(400).json({
      success: false,
      message: "Isi minimal task atau is_completed!",
    });
  }
  if (
    task !== undefined &&
    (typeof task !== "string" ||
      task.trim().length === 0 ||
      task.trim().length > 255)
  ) {
    return res.status(400).json({
      success: false,
      message: "Task harus berupa string yang tidak kosong (maksimal 255 karakter)!",
    });
  }
  if (isCompleted !== undefined && typeof isCompleted !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "is_completed harus berupa true atau false!",
    });
  }
  if (typeof task === "string") req.body.task = task.trim();
  return next();
};

export const validatePatchTodo: RequestHandler = (req, res, next) => {
  if (!isObjectBody(req)) {
    return invalid("Data update tidak valid.")(req, res, next);
  }
  const { task, isCompleted } = req.body;
  if (task === undefined && isCompleted === undefined) {
    return res.status(400).json({
      success: false,
      message: "Isi task atau isCompleted yang ingin diubah.",
    });
  }
  if (
    task !== undefined &&
    (typeof task !== "string" ||
      task.trim().length === 0 ||
      task.trim().length > 255)
  ) {
    return res.status(400).json({
      success: false,
      message: "Task wajib diisi dan maksimal 255 karakter.",
    });
  }
  if (isCompleted !== undefined && typeof isCompleted !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isCompleted harus berupa boolean.",
    });
  }
  if (typeof task === "string") req.body.task = task.trim();
  return next();
};
