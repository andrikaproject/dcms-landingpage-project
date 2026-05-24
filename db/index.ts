import mysql, { type Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Drizzle.");
}

const globalForDrizzle = globalThis as unknown as {
  dcmsMysqlPool?: Pool;
};

export const mysqlPool =
  globalForDrizzle.dcmsMysqlPool ??
  mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDrizzle.dcmsMysqlPool = mysqlPool;
}

export const db = drizzle(mysqlPool, {
  schema,
  mode: "default",
});

export type Db = typeof db;
