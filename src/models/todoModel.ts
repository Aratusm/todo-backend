import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export interface TodoRow extends RowDataPacket {
  id: number;
  user_id: number;
  task: string;
  is_completed: boolean | number | string;
}

export function createTodoModel(pool: Pool) {
  return {
    async getByUserId(userId: number) {
      const [rows] = await pool.execute<TodoRow[]>(
        "SELECT id, user_id, task, is_completed FROM todos WHERE user_id = ? ORDER BY id DESC",
        [userId],
      );
      return rows;
    },

    async getById(id: number, userId: number) {
      const [rows] = await pool.execute<TodoRow[]>(
        "SELECT id, user_id, task, is_completed FROM todos WHERE id = ? AND user_id = ?",
        [id, userId],
      );
      return rows[0];
    },

    async create(task: string, userId: number) {
      const [result] = await pool.execute<ResultSetHeader>(
        "INSERT INTO todos (user_id, task, is_completed) VALUES (?, ?, FALSE)",
        [userId, task],
      );
      return result.insertId;
    },

    async update(
      id: number,
      userId: number,
      changes: { task?: string; isCompleted?: boolean },
    ) {
      const assignments: string[] = [];
      const values: Array<string | number | boolean> = [];

      if (changes.task !== undefined) {
        assignments.push("task = ?");
        values.push(changes.task);
      }

      if (changes.isCompleted !== undefined) {
        assignments.push("is_completed = ?");
        values.push(changes.isCompleted);
      }

      values.push(id, userId);
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE todos SET ${assignments.join(", ")} WHERE id = ? AND user_id = ?`,
        values,
      );
      return result.affectedRows;
    },

    async delete(id: number, userId: number) {
      const [result] = await pool.execute<ResultSetHeader>(
        "DELETE FROM todos WHERE id = ? AND user_id = ?",
        [id, userId],
      );
      return result.affectedRows;
    },
  };
}
