import mysql from "mysql2/promise";

export function createPool(env: NodeJS.ProcessEnv = process.env) {
  const required = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE"] as const;
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing database configuration: ${missing.join(", ")}`);
  }

  return mysql.createPool({
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD || "",
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}
