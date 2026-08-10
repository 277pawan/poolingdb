import http from "http";
import pool from "./db/db.js";

const withdraw = async (accountid, amount) => {
  const client = await pool.connect();
  try {
    console.log("we begin the transactions");

    await client.query(`begin`);
    await client.query(`set local lock_timeout='5s'`);
    const result = await client.query(
      `select * from account where id=$1 for update`,
      [accountid],
    );

    console.log("we got the access");
    if (result.rows.length === 0) {
      throw new Error("Account not found");
    }
    const balance = result.rows[0].balance;
    if (balance < amount) {
      throw new Error("Insufficient balance");
    }
    await client.query(`update account set balance =balance - $1 where id=$2`, [
      amount,
      accountid,
    ]);
    await client.query(`commit`);

    return {
      success: true,
      message: "Widthdraw succssfull!",
    };
  } catch (error) {
    console.log("row is locked ");
    await client.query(`rollback`);
    if (error.code === "55P03") {
      return {
        success: false,
        message: "Account is busy. Please try again.",
      };
    }

    return {
      success: false,
      message: error.message,
    };
  } finally {
    client.release();
  }
};

const server = http.createServer(async (req, res) => {
  if (req.url === "/") {
    res.end("This is our home page.");
  } else if (req.url === "/users") {
    const result = await withdraw(1, 200);

    res.end(JSON.stringify(result));
  }
});
server.on("error", (err) => {
  console.error(err);
});

process.on("uncaughtException", (err) => {
  console.error(err);
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
