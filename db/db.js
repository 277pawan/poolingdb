import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  password: "root",
  database: "nodes",
  port: 5432,
});

export default pool;

