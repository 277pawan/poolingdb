import express from "express";
import pool from "./db/db.js";

const app = express();

app.use(express.json());

app.post("/transfer", async (req, res) => {
  const client = await pool.connect();
  const { fromAccountId, toAccountId, amount } = req.body;
  console.log("Transfer request received:", {
    fromAccountId,
    toAccountId,
    amount,
  });
  try {
    await client.query(`begin`);
    const readBalanceQuery = `select * from account where id=$1 for update`;
    const result = await client.query(readBalanceQuery, [fromAccountId]);

    if (result.rows.length === 0) {
      throw new Error("Account not found");
    }
    const balance = result.rows[0].balance;
    if (balance < amount) {
      throw new Error("Insufficient balance");
    }
    const updateBalanceQuery = `update account set balance=balance-$1 where id =$2`;

    await client.query(updateBalanceQuery, [amount, fromAccountId]);

    const response = await client.query(
      `insert into "transaction" (from_account,to_account,amount,status) values($1,$2,$3,$4) returning *`,
      [fromAccountId, toAccountId, amount, "success"],
    );

    await client.query(`commit`);

    return res.status(200).json({
      success: true,
      message: "Transfer successful",
      data: response.rows[0],
    });
  } catch (error) {
    await client.query("rollback");
    console.error("Error during transfer:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/transaction/:id", async (req, res) => {
  const client = await pool.connect();
  const { id } = req.params;
  try {
    if (id === undefined) {
      return (res, status(400).json({ error: "Transaction id is required" }));
    }
    const response = await client.query(
      `select * from transaction where id=$1`,
      [id],
    );
    if (response.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    return res.status(200).json({
      success: true,
      data: response.rows[0],
      message: "Transaction fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/transactions", async (_, res) => {
  const client = await pool.connect();
  try {
    const response = await client.query(`SELECT
    t.id,
    t.amount,
    t.status,
    t.created_at,

    sender.id AS sender_id,
    sender.name AS sender_name,
    sender.balance AS sender_balance,

    a.id AS receiver_id,
    a.name AS receiver_name,
    a.balance AS receiver_balance

FROM "transaction" t

JOIN account sender
ON t.from_account = sender.id

JOIN account a
ON t.to_account = a.id`);

    if (response.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found",
      });
    }

    return res.status(200).json({
      success: true,
      data: response.rows,
      message: "Transactions fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/balance", async (_, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(`select * from account`);
    return res.status(200).json({
      success: true,
      data: result.rows,
      message: "Balance fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

app.post("/balance", async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, balance } = req.body;
    if (name === undefined || balance === undefined) {
      return res.status(400).json({ error: "name and banlance are required" });
    }

    const result = await client.query(
      `insert into account(name,balance) values($1,$2) returning *`,
      [name, balance],
    );
    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Error creating account:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3000, () => {
  console.log("Express server is running on port 3000");
});
