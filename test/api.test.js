import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.ts";

const jwtSecret = "test-secret-that-is-long-enough-for-the-api";
const todos = [];
const users = [];
let nextTodoId = 1;
let server;
let baseUrl;
const receivedQueries = [];

const pool = {
  async query(sql) {
    assert.equal(sql, "SELECT 1");
    return [[{ 1: 1 }]];
  },
  async execute(sql, values) {
    receivedQueries.push({ sql, values });

    if (sql.startsWith("INSERT INTO users")) {
      users.push({
        id: 12,
        username: values[0],
        email: values[1],
        password: values[2],
      });
      return [{ insertId: 12 }];
    }

    if (sql.startsWith("SELECT id, username, email, password FROM users")) {
      const user = users.find(
        (item) => item.email === values[0] || item.username === values[1],
      );
      return [user ? [user] : []];
    }

    if (sql.startsWith("SELECT id, user_id, task, is_completed FROM todos WHERE user_id")) {
      return [todos.filter((todo) => todo.user_id === values[0])];
    }

    if (sql.startsWith("INSERT INTO todos")) {
      const todo = {
        id: nextTodoId++,
        user_id: values[0],
        task: values[1],
        is_completed: false,
      };
      todos.push(todo);
      return [{ insertId: todo.id }];
    }

    if (sql.startsWith("UPDATE todos SET")) {
      const id = values.at(-2);
      const userId = values.at(-1);
      const todo = todos.find((item) => item.id === id && item.user_id === userId);

      if (!todo) {
        return [{ affectedRows: 0 }];
      }

      let valueIndex = 0;
      if (sql.includes("task = ?")) {
        todo.task = values[valueIndex++];
      }
      if (sql.includes("is_completed = ?")) {
        todo.is_completed = values[valueIndex];
      }
      return [{ affectedRows: 1 }];
    }

    if (sql.startsWith("SELECT id, user_id, task, is_completed FROM todos WHERE id")) {
      const todo = todos.find(
        (item) => item.id === values[0] && item.user_id === values[1],
      );
      return [todo ? [todo] : []];
    }

    if (sql.startsWith("DELETE FROM todos")) {
      const index = todos.findIndex(
        (item) => item.id === values[0] && item.user_id === values[1],
      );
      if (index < 0) {
        return [{ affectedRows: 0 }];
      }
      todos.splice(index, 1);
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL in test: ${sql}`);
  },
};

function tokenFor(userId) {
  return jwt.sign({}, jwtSecret, { subject: String(userId), expiresIn: "1h" });
}

before(async () => {
  const app = createApp({ pool, jwtSecret });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("authenticates users and protects todo CRUD by owner", async () => {
  const root = await fetch(`${baseUrl}/`);
  assert.equal(root.status, 200);
  assert.deepEqual(await root.json(), {
    success: true,
    message: "Backend Todo Praktikum Berjalan Mulus!",
  });

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    status: "ok",
    database: "connected",
  });

  const unauthenticated = await fetch(`${baseUrl}/api/todos`);
  assert.equal(unauthenticated.status, 401);
  assert.deepEqual(await unauthenticated.json(), {
    success: false,
    message: "Akses ditolak. Token tidak ditemukan!",
  });

  const missingRoute = await fetch(`${baseUrl}/api/sembarang`);
  assert.equal(missingRoute.status, 404);
  assert.deepEqual(await missingRoute.json(), {
    success: false,
    message: "Route GET /api/sembarang tidak ditemukan!",
  });

  const disallowedOrigin = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: "https://not-allowed.example" },
  });
  assert.equal(disallowedOrigin.status, 403);

  const invalidRegistration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "andi",
      email: "not-an-email",
      password: "password123",
    }),
  });
  assert.equal(invalidRegistration.status, 400);

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "andi",
      email: "andi@example.com",
      password: "password123",
    }),
  });
  assert.equal(registration.status, 201);
  const registered = await registration.json();
  assert.deepEqual(registered.user, {
    id: 12,
    username: "andi",
    email: "andi@example.com",
  });
  assert.ok(registered.token);
  assert.match(receivedQueries.at(-1).values[2], /^\$2[aby]\$/);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "ANDI@example.com",
      password: "password123",
    }),
  });
  assert.equal(login.status, 200);
  const loggedIn = await login.json();
  assert.equal(loggedIn.user.id, 12);
  assert.ok(loggedIn.token);

  const authHeaders = {
    Authorization: `Bearer ${loggedIn.token}`,
    "Content-Type": "application/json",
  };
  const invalidTodo = await fetch(`${baseUrl}/api/todos`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ task: "  " }),
  });
  assert.equal(invalidTodo.status, 400);

  const create = await fetch(`${baseUrl}/api/todos`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ task: "  Belajar Express  " }),
  });
  assert.equal(create.status, 201);
  const created = await create.json();
  assert.deepEqual(created.todo, {
    id: 1,
    userId: 12,
    task: "Belajar Express",
    isCompleted: false,
  });

  const ownTodos = await fetch(`${baseUrl}/api/todos`, {
    headers: { Authorization: `Bearer ${loggedIn.token}` },
  });
  assert.deepEqual(await ownTodos.json(), {
    success: true,
    data: [
      {
        id: 1,
        user_id: 12,
        task: "Belajar Express",
        is_completed: false,
      },
    ],
  });

  const ownTodo = await fetch(`${baseUrl}/api/todos/1`, {
    headers: { Authorization: `Bearer ${loggedIn.token}` },
  });
  assert.deepEqual(await ownTodo.json(), {
    success: true,
    data: {
      id: 1,
      user_id: 12,
      task: "Belajar Express",
      is_completed: false,
    },
  });

  const otherUserTodos = await fetch(`${baseUrl}/api/todos`, {
    headers: { Authorization: `Bearer ${tokenFor(99)}` },
  });
  assert.deepEqual(await otherUserTodos.json(), {
    success: true,
    data: [],
  });

  const otherUsersTodo = await fetch(`${baseUrl}/api/todos/1`, {
    headers: { Authorization: `Bearer ${tokenFor(99)}` },
  });
  assert.equal(otherUsersTodo.status, 404);

  const wrongPassword = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "andi",
      password: "wrong-password",
    }),
  });
  assert.equal(wrongPassword.status, 401);

  const update = await fetch(`${baseUrl}/api/todos/1`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ task: "Selesai belajar Express", isCompleted: true }),
  });
  assert.equal(update.status, 200);
  assert.deepEqual((await update.json()).todo, {
    id: 1,
    userId: 12,
    task: "Selesai belajar Express",
    isCompleted: true,
  });

  const putUpdate = await fetch(`${baseUrl}/api/todos/1`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ task: "Review Tugas 5", is_completed: false }),
  });
  assert.equal(putUpdate.status, 200);
  assert.deepEqual(await putUpdate.json(), {
    success: true,
    message: "Tugas berhasil diperbarui!",
  });

  const invalidPutUpdate = await fetch(`${baseUrl}/api/todos/1`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ is_completed: "false" }),
  });
  assert.equal(invalidPutUpdate.status, 400);

  const emptyPutUpdate = await fetch(`${baseUrl}/api/todos/1`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  assert.equal(emptyPutUpdate.status, 400);

  const forbiddenUpdate = await fetch(`${baseUrl}/api/todos/1`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tokenFor(99)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task: "Tidak boleh mengubah todo pengguna lain" }),
  });
  assert.equal(forbiddenUpdate.status, 404);

  const forbiddenPutUpdate = await fetch(`${baseUrl}/api/todos/1`, {
    method: "PUT",
    headers: {
      ...authHeaders,
      Authorization: `Bearer ${tokenFor(99)}`,
    },
    body: JSON.stringify({ is_completed: true }),
  });
  assert.equal(forbiddenPutUpdate.status, 404);

  const remove = await fetch(`${baseUrl}/api/todos/1`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${loggedIn.token}` },
  });
  assert.equal(remove.status, 200);
  assert.deepEqual(await remove.json(), {
    success: true,
    message: "Tugas berhasil dihapus!",
  });

  const deletedTodo = await fetch(`${baseUrl}/api/todos/1`, {
    headers: authHeaders,
  });
  assert.equal(deletedTodo.status, 404);
  assert.deepEqual(await deletedTodo.json(), {
    success: false,
    message: "Tugas tidak ditemukan!",
  });
});
