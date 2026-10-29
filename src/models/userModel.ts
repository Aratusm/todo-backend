import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password: string;
}

export function createUserModel(pool: Pool) {
  return {
    async create(username: string, email: string, password: string) {
      const [result] = await pool.execute<ResultSetHeader>(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, password],
      );

      return {
        id: result.insertId,
        username,
        email,
      };
    },

    async findByIdentifier(identifier: string) {
      const [rows] = await pool.execute<UserRow[]>(
        "SELECT id, username, email, password FROM users WHERE email = ? OR username = ? LIMIT 1",
        [identifier.toLowerCase(), identifier],
      );
      return rows[0];
    },
  };
}
